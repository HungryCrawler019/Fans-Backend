import {
	FanReferralTransactionType,
	SubscriptionStatus,
	TransactionStatus,
} from "@prisma/client";
import { FastifyPluginOptions } from "fastify";
import { Stripe } from "stripe";
import dinero, { Dinero } from "dinero.js";
import AuthorizeNetService from "../../../common/service/AuthorizeNetService.js";
import FeesCalculator from "../../../common/service/FeesCalculatorService.js";
import GemExchangeService from "../../../common/service/GemExchangeService.js";
import PayPalService from "../../../common/service/PayPalService.js";
import PayoutService from "../../../common/service/PayoutService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import StripeService from "../../../common/service/StripeService.js";
import NotificationService from "../../../common/service/NotificationService.js";
import EmailTemplateSenderService from "../../../common/service/EmailTemplateSenderService.js";
import SiftService from "../../../common/service/SiftService.js";
import APIErrors from "../../errors/index.js";
import { FastifyTypebox } from "../../types.js";
import { setInterval } from "node:timers/promises";
import {
	AuthorizeNetGemPurchaseReqBody,
	PayPalGemPurchaseReqBody,
	PriceReqBody,
	StripeGemPurchaseReqBody,
	TipReqBody,
	CameoPriceReqQuery,
	PurchaseCameoReqBody,
} from "./schemas.js";
import {
	AuthorizeNetGemPurchaseReqBodyValidator,
	PayPalGemPurchaseReqBodyValidator,
	PriceReqBodyValidator,
	StripeGemPurchaseReqBodyValidator,
	TipReqBodyValidator,
	CameoPriceReqQueryValidator,
	PurchaseCameoReqBodyValidator,
} from "./validation.js";
import {
	CreatorReferralTransactionType,
	NotificationType,
} from "../../CommonAPISchemas.js";
import { TaxjarError } from "taxjar/dist/util/types.js";

const DECIMAL_TO_CENT_FACTOR = 100;

interface StripeSubscriptionWebhookData {
	id: string;
	status: string;
	payment_intent?: string;
	metadata: {
		userId: string;
		transactionId: string;
	};
	billing_details?: {
		name?: string;
		email?: string;
		phone?: string;
		address: {
			city?: string;
			country: string;
			line1?: string;
			line2?: string;
			postal_code?: string;
			state?: string;
		};
	};
	payment_method_details?: {
		type: string;
		card?: {
			brand: string;
			checks: {
				address_line1_check?: string;
				address_postal_code_check?: string;
				cvc_check?: string;
			};
			country: string;
			exp_month: number;
			exp_year: number;
			last4: string;
			funding: string;
		};
	};
}

export default async function routes(
	fastify: FastifyTypebox,
	options: FastifyPluginOptions,
) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);
	const payoutService = await container.resolve(PayoutService);
	const paypalService = await container.resolve(PayPalService);
	const stripeService = await container.resolve(StripeService);
	const authorizeNetService = await container.resolve(AuthorizeNetService);
	const feesCalculator = await container.resolve(FeesCalculator);
	const gemExchangeService = await container.resolve(GemExchangeService);
	const notification = await container.resolve(NotificationService);
	const emailTemplateSenderService = await container.resolve(
		EmailTemplateSenderService,
	);
	const siftService = await container.resolve(SiftService);

	const formatPriceForNotification = (
		dinero: Dinero,
		currency: string = "USD",
	) => {
		return `${dinero.toFormat("0.00")} ${currency}`;
	};

	const processCreatorReferralFee = async (
		code: string,
		referentId: string,
		type: CreatorReferralTransactionType,
		cent: number,
		transactionId: string,
	) => {
		const creatorReferral = await prisma.creatorReferral.findFirst({
			where: { code: { equals: code, mode: "insensitive" } },
		});
		if (!creatorReferral) {
			return;
		}
		const referrerBalance = await prisma.balance.findFirst({
			where: { profileId: creatorReferral.profileId },
		});
		const referralFee = feesCalculator.calcCreatorReferralFee(cent);

		if (referrerBalance) {
			await prisma.balance.update({
				where: { id: referrerBalance.id },
				data: {
					amount: { increment: referralFee.getAmount() },
				},
			});
		}

		await prisma.creatorReferralTransaction.create({
			data: {
				id: snowflake.gen(),
				referentId: BigInt(referentId),
				referrerId: creatorReferral.profileId,
				type,
				transactionId: BigInt(transactionId),
				amount: referralFee.getAmount(),
			},
		});
	};

	fastify.post<{ Body: PriceReqBody }>(
		"/price",
		{
			schema: {
				body: PriceReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { gems, customerInformation } = request.body;

			const amountDinero = gemExchangeService.gemExchange(gems);

			const feesOutput = await feesCalculator.purchaseGemsServiceFees(
				amountDinero.getAmount(),
				customerInformation,
			);

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			return reply.send({
				gems,
				amount: feesOutput.amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				platformFee:
					feesOutput.platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
				vatFee: feesOutput.vatFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
				total:
					feesOutput.totalAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
			});
		},
	);

	fastify.post<{ Body: TipReqBody }>(
		"/tip",
		{
			schema: {
				body: TipReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { creatorId, gems, message, fanReferralCode } = request.body;

			if (gems <= 0) {
				return reply.sendError(APIErrors.INVALID_AMOUNT);
			}

			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = await session.getProfile(prisma);

			if (profile?.id === BigInt(creatorId)) {
				return reply.sendError(APIErrors.TIP_SELF);
			}

			const creator = await prisma.profile.findFirst({
				where: { id: BigInt(creatorId) },
				select: {
					id: true,
					userId: true,
					displayName: true,
					platformFee: true,
					user: true,
					referrerCode: true,
					notificationsSettings: true,
				},
			});

			if (!creator) return reply.sendError(APIErrors.PAYMENT_FAILED());

			const amountDinero = gemExchangeService.gemExchange(gems);

			const { amount, processingFee, platformFee, netAmount } =
				feesCalculator.creatorGemsTransactionFee(
					amountDinero.getAmount(),
					creator.platformFee,
				);

			const fanReferral = fanReferralCode
				? await prisma.fanReferral.findFirst({
						where: { code: fanReferralCode },
						select: { id: true, profile: true, userId: true },
				  })
				: undefined;

			const transaction = await prisma.$transaction(async (prisma) => {
				const spenderBalance = await prisma.gemsBalance.findFirst({
					where: { userId: user.id },
					select: { id: true, amount: true },
				});

				const creatorBalance = await prisma.balance.findFirst({
					where: { profileId: creator.id },
					select: { id: true, amount: true },
				});

				const fanReferrerBalance = fanReferral
					? await prisma.gemsBalance.findFirst({
							where: { userId: fanReferral.userId },
							select: { id: true, amount: true },
					  })
					: undefined;

				if (
					!spenderBalance ||
					!creatorBalance ||
					amountDinero.getAmount() > spenderBalance.amount
				) {
					reply.sendError(APIErrors.INSUFFICIENT_FUNDS);
					return;
				}

				await prisma.gemsBalance.update({
					where: { id: spenderBalance.id },
					data: { amount: { decrement: amount.getAmount() } },
				});

				const transactionId = snowflake.gen();

				if (fanReferral && fanReferrerBalance) {
					const fanReferralAmount =
						(amount.getAmount() *
							fanReferral.profile.fanReferralShare) /
						100;
					await prisma.gemsBalance.update({
						where: { id: fanReferrerBalance.id },
						data: {
							amount: { increment: fanReferralAmount },
						},
					});

					await prisma.gemsBalance.update({
						where: { id: creatorBalance.id },
						data: {
							amount: {
								increment:
									netAmount.getAmount() - fanReferralAmount,
							},
						},
					});

					await prisma.fanReferralTransaction.create({
						data: {
							id: snowflake.gen(),
							referentId: user.id,
							referrerId: fanReferral.userId,
							creatorId: creator.id,
							fanReferralId: fanReferral.id,
							type: FanReferralTransactionType.Tip,
							transactionId: transactionId,
							amount: fanReferralAmount,
						},
					});

					await prisma.fanReferral.update({
						where: { id: fanReferral.id },
						data: { visitCount: { increment: 1 } },
					});
				} else {
					await prisma.balance.update({
						where: { id: creatorBalance.id },
						data: { amount: { increment: netAmount.getAmount() } },
					});
				}

				return await prisma.gemsSpendingLog.create({
					data: {
						id: transactionId,
						spenderId: BigInt(user.id),
						creatorId: BigInt(creator.id),
						type: "Tip",
						message: message,
						amount: amount.getAmount(),
						processingFee: 0,
						platformFee: 0,
						fanReferralCode: fanReferralCode,
					},
				});
			});

			if (transaction?.id) {
				(async () => {
					const fan = await prisma.user.findFirst({
						where: { id: BigInt(user.id) },
						select: { notificationsSettings: true },
					});

					if (!creator) return;
					if (!fan) return;

					await siftService.transaction({
						$user_id: user.id.toString(),
						$user_email: user.email,
						$amount: amount.getAmount() * 10000,
						$currency_code: "USD",
						$transaction_id: transaction.id.toString(),
						$transaction_type: "$transfer",
						$transaction_status: "$success",
						$ip: request.ip,
						$seller_user_id: creator.id.toString(),
						$transfer_recipient_user_id: creator.id.toString(),
						$payment_method: {
							$payment_type: "$digital_wallet",
						},
						$browser: {
							$user_agent: request.headers["user-agent"] ?? "",
							$accept_language:
								request.headers["accept-language"] ?? "",
						},
					});

					if (creator.notificationsSettings?.tipCreatorInApp) {
						await notification.createNotification(creator.userId, {
							type: NotificationType.Tips,
							users: [user.id],
							price: formatPriceForNotification(amount),
						});
					}

					if (creator.notificationsSettings?.tipCreatorEmail) {
						await emailTemplateSenderService.sendTipConfirmation(
							user.email,
							{
								fanName:
									user.displayName ?? user.username ?? "",
								creatorName: creator.displayName ?? "",
							},
						);
					}

					if (fan.notificationsSettings?.transactionFanEmail) {
						await emailTemplateSenderService.sendTipReceived(
							creator.user!.email,
							{
								fanName:
									user.displayName ?? user.username ?? "",
								creatorName: creator.displayName ?? "",
							},
						);
					}
				})();

				if (creator.referrerCode) {
					await processCreatorReferralFee(
						creator.referrerCode,
						creator.id.toString(),
						"Tip",
						amountDinero.getAmount(),
						transaction.id.toString(),
					);
				}

				// await xpService.addXPLog(
				//  "Donate",
				//  amount.getAmount(),
				//  user.id,
				//  creator.id,
				// );
			}

			await payoutService.processPayout(creator.id).catch(() => void 0);

			return reply.send({
				message: `Successfully tipped ${amount} USD worth of gems!`,
			});
		},
	);

	fastify.get<{ Querystring: CameoPriceReqQuery }>(
		"/cameo/price",
		{
			schema: {
				querystring: CameoPriceReqQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const { price, customerPaymentProfileId } = request.query;

			let customerInformation;

			if (customerPaymentProfileId) {
				const paymentMethod = await prisma.paymentMethod.findFirst({
					where: {
						userId: user.id,
						provider: "AuthorizeNet",
					},
				});

				if (!paymentMethod) {
					return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
				}

				const customerProfile =
					await authorizeNetService.fetchCustomerProfile(
						paymentMethod.token,
					);

				if (customerProfile.getMessages().getResultCode() !== "Ok") {
					return reply.sendError(
						APIErrors.PAYMENT_METHOD_FETCH_FAILED(
							customerProfile
								.getMessages()
								.getMessage()[0]
								.getText(),
						),
					);
				}

				const customerPaymentProfile =
					customerProfile.profile.paymentProfiles.find(
						(profile: any) =>
							profile.customerPaymentProfileId ===
							customerPaymentProfileId,
					);

				if (!customerPaymentProfile) {
					return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				}

				if (!customerProfile) {
					return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
				}

				customerInformation = {
					country: customerPaymentProfile.billTo.country,
					state: customerPaymentProfile.billTo.state,
					city: customerPaymentProfile.billTo.city,
					zip: customerPaymentProfile.billTo.zip,
					address: customerPaymentProfile.billTo.address,
				};
			}

			const amountDinero = dinero({
				amount: Math.round(price * DECIMAL_TO_CENT_FACTOR),
			});

			const feesOutput = await feesCalculator.purchaseServiceFees(
				amountDinero.getAmount(),
				customerInformation,
			);

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			reply.send({
				amount: feesOutput.amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				platformFee:
					feesOutput.platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
				vatFee: feesOutput.vatFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
				totalAmount:
					feesOutput.totalAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
			});
		},
	);

	fastify.post<{ Body: PurchaseCameoReqBody }>(
		"/cameo/purchase",
		{
			schema: {
				body: PurchaseCameoReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				authorizeNetService.webhookPrehandler,
			],
		},
		async (request, reply) => {
			const { price, creatorId, customerPaymentProfileId } = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = await session.getProfile(prisma);

			const creator = await prisma.profile.findFirst({
				where: { id: BigInt(creatorId) },
			});

			if (!creator) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			if (creator.id === profile?.id) {
				return reply.sendError(APIErrors.PURCHASE_POST_SELF);
			}

			const alreadyPurchased = await prisma.cameoPayment.findFirst({
				where: {
					userId: user.id,
					OR: [
						{
							status: TransactionStatus.Successful,
						},
						{
							AND: [
								{
									status: {
										in: [
											TransactionStatus.Initialized,
											TransactionStatus.Submitted,
										],
									},
								},
								{
									createdAt: {
										gte: new Date(
											Date.now() - 5 * 60 * 1000,
										).toISOString(),
									},
								},
							],
						},
					],
				},
			});

			if (alreadyPurchased) {
				return reply.sendError(APIErrors.POST_ALREADY_PURCHASED);
			}

			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					userId: user.id,
					provider: "AuthorizeNet",
				},
			});

			if (!paymentMethod) {
				return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
			}

			const customerProfile =
				await authorizeNetService.fetchCustomerProfile(
					paymentMethod.token,
				);

			if (customerProfile.getMessages().getResultCode() !== "Ok") {
				return reply.sendError(
					APIErrors.PAYMENT_METHOD_FETCH_FAILED(
						customerProfile.getMessages().getMessage()[0].getText(),
					),
				);
			}

			const customerPaymentProfile =
				customerProfile.profile.paymentProfiles.find(
					(profile: any) =>
						profile.customerPaymentProfileId ===
						customerPaymentProfileId,
				);

			if (!customerPaymentProfile) {
				return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
			}

			if (!customerProfile) {
				return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
			}

			const customerInformation = {
				country: customerPaymentProfile.billTo.country,
				state: customerPaymentProfile.billTo.state,
				city: customerPaymentProfile.billTo.city,
				zip: customerPaymentProfile.billTo.zip,
				address: customerPaymentProfile.billTo.address,
			};

			const amountDinero = dinero({
				amount: Math.round(price * DECIMAL_TO_CENT_FACTOR),
			});

			const feesOutput = await feesCalculator.purchaseServiceFees(
				amountDinero.getAmount(),
				customerInformation,
			);

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			const cameoPayment = await prisma.cameoPayment.create({
				data: {
					id: snowflake.gen(),
					userId: user.id,
					creatorId: creator.id,
					paymentMethodId: paymentMethod.id,
					paymentProfileId:
						customerPaymentProfile.customerPaymentProfileId,

					provider: "AuthorizeNet",
					amount: feesOutput.amount.getAmount(),
					processingFee: 0,
					platformFee: feesOutput.platformFee.getAmount(),
					vatFee: feesOutput.vatFee.getAmount(),
					status: "Initialized",
				},
			});

			const siftTransaction = async (
				status: "$success" | "$failure" | "$pending",
				orderId?: string,
			) => {
				return await siftService.transaction({
					$user_id: user.id.toString(),
					$user_email: user.email,
					$amount: feesOutput.totalAmount.getAmount() * 10000,
					$currency_code: "USD",
					$order_id: orderId,
					$transaction_id: cameoPayment.id.toString(),
					$transaction_type: "$sale",
					$transaction_status: status,
					$ip: request.ip,
					$seller_user_id: creator.id.toString(),
					$billing_address: {
						$name:
							customerPaymentProfile.billTo.firstName +
							" " +
							customerPaymentProfile.billTo.lastName,
						$address_1: customerPaymentProfile.billTo.address,
						$city: customerPaymentProfile.billTo.city,
						$region: customerPaymentProfile.billTo.state,
						$country: customerPaymentProfile.billTo.country,
						$zipcode: customerPaymentProfile.billTo.zip,
					},
					$payment_method: {
						$payment_type: "$credit_card",
						$payment_gateway: "$authorizenet",
						$account_holder_name:
							customerPaymentProfile.billTo.firstName +
							" " +
							customerPaymentProfile.billTo.lastName,
						$card_last4:
							customerPaymentProfile.payment.creditCard.cardNumber.slice(
								-4,
							),
						$verification_status: "$success",
					},
					$browser: {
						$user_agent: request.headers["user-agent"] ?? "",
						$accept_language:
							request.headers["accept-language"] ?? "",
					},
				});
			};

			const response = await siftTransaction("$pending");

			const hasBadPaymentAbuseDecision =
				response.score_response.workflow_statuses.some((workflow) =>
					workflow.history.some(
						(historyItem) =>
							historyItem.config.decision_id ===
							"looks_bad_payment_abuse",
					),
				);

			if (hasBadPaymentAbuseDecision) {
				await prisma.cameoPayment.update({
					where: { id: cameoPayment.id },
					data: {
						status: "Failed",
						error: "Transaction flagged as fraudulent.",
					},
				});

				await siftTransaction("$failure");

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						"Failed because of fraud detection, if you believe this is an error contact support.",
					),
				);
			}

			const paymentResponse =
				await authorizeNetService.createPaymentTransaction({
					customerProfileId: paymentMethod.token,
					customerPaymentProfileId:
						customerPaymentProfile.customerPaymentProfileId,
					description: `Purchase Cameo from ${creator.displayName}`,
					amount:
						feesOutput.totalAmount.getAmount() /
						DECIMAL_TO_CENT_FACTOR,
					merchantData: {
						userId: user.id.toString(),
						transactionId: cameoPayment.id.toString(),
					},
				});

			if (paymentResponse.getMessages().getResultCode() !== "Ok") {
				await prisma.cameoPayment.update({
					where: { id: cameoPayment.id },
					data: {
						status: "Failed",
						error: paymentResponse
							.getMessages()
							.getMessage()[0]
							.getText(),
					},
				});

				await siftTransaction(
					"$failure",
					paymentResponse.transactionResponse.transId,
				);

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						paymentResponse.getMessages().getMessage()[0].getText(),
					),
				);
			}

			if (paymentResponse.getTransactionResponse().getErrors()) {
				await prisma.cameoPayment.update({
					where: { id: cameoPayment.id },
					data: {
						status: "Failed",
						error: paymentResponse
							.getTransactionResponse()
							.getErrors()
							.getError()[0]
							.getErrorText(),
					},
				});

				await siftTransaction(
					"$failure",
					paymentResponse.transactionResponse.transId,
				);

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						paymentResponse
							.getTransactionResponse()
							.getErrors()
							.getError()[0]
							.getErrorText(),
					),
				);
			}

			await prisma.cameoPayment.update({
				where: { id: cameoPayment.id },
				data: {
					status: "Submitted",
					transactionId: paymentResponse
						.getTransactionResponse()
						?.getTransId(),
				},
			});

			const POLL_INTERVAL = 1000;
			const MAX_DURATION = 60000;

			const startTime = Date.now();

			for await (const _ of setInterval(POLL_INTERVAL)) {
				const cameoPaymentStatus = await prisma.cameoPayment.findUnique(
					{
						where: { id: cameoPayment.id },
						select: { status: true },
					},
				);

				if (
					cameoPaymentStatus?.status === TransactionStatus.Successful
				) {
					clearInterval(POLL_INTERVAL);
					return reply.send({
						message: "Post purchased successfully!",
					});
				}

				if (Date.now() - startTime > MAX_DURATION) {
					clearInterval(POLL_INTERVAL);
					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							"Transaction processing took too long. Please check back later.",
						),
					);
				}
			}
		},
	);

	fastify.post<{ Body: StripeGemPurchaseReqBody }>(
		"/purchase/stripe",
		{
			schema: {
				body: StripeGemPurchaseReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { gems, customerInformation } = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);

			if (gems <= 0) {
				return reply.sendError(APIErrors.INVALID_AMOUNT);
			}

			const gemBalance = await prisma.gemsBalance.findFirst({
				where: { userId: user.id },
			});

			const amountDinero = gemExchangeService.gemExchange(gems);

			if (!gemBalance) {
				return reply.sendError(APIErrors.PAYMENT_FAILED());
			}

			const feesOutput = await feesCalculator.purchaseGemsServiceFees(
				amountDinero.getAmount(),
				customerInformation,
			);

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			const transaction = await prisma.gemTransaction.create({
				include: {
					balance: true,
				},
				data: {
					id: snowflake.gen(),
					balanceId: gemBalance.id,
					userId: user.id,
					provider: "Stripe",
					amount: feesOutput.amount.getAmount(),
					platformFee: feesOutput.platformFee.getAmount(),
					processingFee: 0,
					vatFee: feesOutput.vatFee.getAmount(),
					status: "Initialized",
				},
			});

			const paymentIntent = await stripeService.createPaymentIntent({
				amount: feesOutput.totalAmount.getAmount(),
				metadata: {
					userId: user.id.toString(),
					transactionId: transaction.id.toString(),
				},
			});

			const { balance, ...updateData } = transaction;

			updateData.status = "Submitted";
			updateData.transactionId = paymentIntent.id;

			await prisma.gemTransaction.update({
				where: { id: transaction.id },
				data: updateData,
			});

			return reply.send({
				clientSecret: paymentIntent.client_secret,
			});
		},
	);

	fastify.post<{ Body: PayPalGemPurchaseReqBody }>(
		"/purchase/paypal",
		{
			schema: {
				body: PayPalGemPurchaseReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { gems, customerInformation } = request.body;

			if (gems <= 0) {
				return reply.sendError(APIErrors.INVALID_AMOUNT);
			}

			const session = request.session!;
			const user = await session.getUser(prisma);

			const gemBalance = await prisma.gemsBalance.findFirst({
				where: { userId: user.id },
			});

			const amountDinero = gemExchangeService.gemExchange(gems);

			if (!gemBalance) return reply.sendError(APIErrors.PAYMENT_FAILED());

			const feesOutput = await feesCalculator.purchaseGemsServiceFees(
				amountDinero.getAmount(),
				customerInformation,
			);

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			const transaction = await prisma.gemTransaction.create({
				include: {
					balance: true,
				},
				data: {
					id: snowflake.gen(),
					balanceId: gemBalance.id,
					userId: user.id,
					provider: "PayPal",
					amount: feesOutput.amount.getAmount(),
					platformFee: feesOutput.platformFee.getAmount(),
					processingFee: 0,
					vatFee: feesOutput.vatFee.getAmount(),
					status: "Initialized",
				},
			});

			const payment = await paypalService.createOrder({
				intent: "CAPTURE",
				purchase_units: [
					{
						custom_id: transaction.id.toString(),
						amount: {
							currency_code: "USD",
							value: String(
								feesOutput.totalAmount.getAmount() /
									DECIMAL_TO_CENT_FACTOR,
							),
						},
						description: "Purchase Gems",
					},
				],
				application_context: {
					return_url: `${process.env
						.PUBLIC_URL!}/api/v1/gems/purchase/paypal/success`,
					cancel_url: process.env.PUBLIC_URL!,
				},
			});

			interface LinkObject {
				rel: string;
				href: string;
			}

			const approvalLink = payment.data.links.find(
				(link: LinkObject) => link.rel === "approve",
			).href;

			const { balance, ...updateData } = transaction;

			updateData.transactionId = payment.data.id;

			await prisma.gemTransaction.update({
				where: { id: transaction.id },
				data: updateData,
			});

			return reply.send({ approvalLink });
		},
	);

	fastify.get<{ Querystring: { token: string; PayerID: string } }>(
		"/purchase/paypal/success",
		async (request, reply) => {
			const { token } = request.query;

			const capture = await paypalService.captureOrder(token);

			if (capture.data.status === "COMPLETED") {
				await prisma.gemTransaction.update({
					where: { transactionId: token },
					data: { status: "Submitted" },
				});

				return reply.redirect(
					`${process.env
						.PUBLIC_URL!}/get-gems?paypal=success&transactionId=${token}`,
				);
			} else {
				return reply.sendError(APIErrors.PAYMENT_FAILED());
			}
		},
	);

	fastify.post<{ Body: AuthorizeNetGemPurchaseReqBody }>(
		"/purchase/authorize-net",
		{
			schema: {
				body: AuthorizeNetGemPurchaseReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				authorizeNetService.webhookPrehandler,
			],
		},
		async (request, reply) => {
			const { opaqueDataValue, gems, customerInformation } = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);

			if (gems <= 0) {
				return reply.sendError(APIErrors.INVALID_AMOUNT);
			}

			const gemBalance = await prisma.gemsBalance.findFirst({
				where: { userId: user.id },
			});

			const amountDinero = gemExchangeService.gemExchange(gems);

			if (!gemBalance) return reply.sendError(APIErrors.PAYMENT_FAILED());

			const feesOutput = await feesCalculator.purchaseGemsServiceFees(
				amountDinero.getAmount(),
				customerInformation,
			);

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			const transaction = await prisma.gemTransaction.create({
				include: {
					balance: true,
				},
				data: {
					id: snowflake.gen(),
					balanceId: gemBalance.id,
					userId: user.id,
					provider: "AuthorizeNet",
					amount: feesOutput.amount.getAmount(),
					platformFee: feesOutput.platformFee.getAmount(),
					processingFee: 0,
					vatFee: feesOutput.vatFee.getAmount(),
					status: "Initialized",
				},
			});

			const siftTransaction = async (
				status: "$success" | "$failure" | "$pending",
				orderId?: string,
			) => {
				let cardNumber;

				if (orderId) {
					const transactionDetails =
						await authorizeNetService.getTransactionDetails(
							orderId,
						);
					cardNumber =
						transactionDetails.transaction.payment.creditCard
							.cardNumber;
				}

				return await siftService.transaction({
					$user_id: user.id.toString(),
					$user_email: user.email,
					$amount: feesOutput.totalAmount.getAmount() * 10000,
					$currency_code: "USD",
					$order_id: orderId,
					$transaction_id: transaction.id.toString(),
					$transaction_type: "$sale",
					$transaction_status: status,
					$ip: request.ip,
					$payment_method: {
						$payment_type: "$credit_card",
						$payment_gateway: "$authorizenet",
						$account_holder_name:
							customerInformation.firstName +
							" " +
							customerInformation.lastName,
						$card_last4: cardNumber?.slice(-4),
						$verification_status: "$success",
					},
					$billing_address: {
						$name:
							customerInformation.firstName +
							" " +
							customerInformation.lastName,
						$address_1: customerInformation.address,
						$city: customerInformation.city,
						$region: customerInformation.state,
						$country: customerInformation.country,
						$zipcode: customerInformation.zip,
					},
					$browser: {
						$user_agent: request.headers["user-agent"] ?? "",
						$accept_language:
							request.headers["accept-language"] ?? "",
					},
				});
			};

			const response = await siftTransaction("$pending");

			const hasBadPaymentAbuseDecision =
				response.score_response.workflow_statuses.some((workflow) =>
					workflow.history.some(
						(historyItem) =>
							historyItem.config.decision_id ===
							"looks_bad_payment_abuse",
					),
				);

			if (hasBadPaymentAbuseDecision) {
				await prisma.gemTransaction.update({
					where: { id: transaction.id },
					data: {
						status: "Failed",
						error: "Transaction flagged as fraudulent.",
					},
				});

				await siftTransaction("$failure");

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						"Failed because of fraud detection, if you believe this is an error contact support.",
					),
				);
			}

			const payment =
				await authorizeNetService.createAcceptPaymentTransaction({
					opaqueDataValue,
					amount:
						feesOutput.totalAmount.getAmount() /
						DECIMAL_TO_CENT_FACTOR,
					description: "Purchase Gems",
					customerData: {
						email: user.email,
						firstName: customerInformation.firstName,
						lastName: customerInformation.lastName,
						country: customerInformation.country,
						state: customerInformation.state,
						address: customerInformation.address,
						city: customerInformation.city,
						zip: customerInformation.zip,
					},
					merchantData: {
						userId: user.id.toString(),
						transactionId: snowflake.gen().toString(),
					},
				});

			if (payment.messages.resultCode !== "Ok") {
				await siftTransaction(
					"$failure",
					payment.transactionResponse.transId,
				);

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(payment.messages.message[0].text),
				);
			}

			const { balance, ...updateData } = transaction;

			updateData.transactionId = payment.transactionResponse.transId;
			updateData.status = "Submitted";

			await prisma.gemTransaction.update({
				where: { id: transaction.id },
				data: updateData,
			});

			const POLL_INTERVAL = 1000;
			const MAX_DURATION = 45000;

			const startTime = Date.now();

			for await (const _ of setInterval(POLL_INTERVAL)) {
				const gemTransactionStatus =
					await prisma.gemTransaction.findUnique({
						where: { id: transaction.id },
						select: { status: true },
					});

				if (
					gemTransactionStatus?.status ===
					TransactionStatus.Successful
				) {
					clearInterval(POLL_INTERVAL);
					return reply.send({ orderID: payment.refId });
				}

				if (Date.now() - startTime > MAX_DURATION) {
					clearInterval(POLL_INTERVAL);
					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							"Transaction processing took too long. Please check back later.",
						),
					);
				}
			}
		},
	);

	fastify.post(
		"/webhook/stripe",
		{
			config: {
				rawBody: true,
			},
		},
		async (request, reply) => {
			const sig = request.headers["stripe-signature"] as string;

			if (!request.rawBody) {
				return reply.sendError(APIErrors.WEBHOOK_PAYLOAD_MISSING);
			}

			const event: Stripe.Event = stripeService.constructEvent(
				Buffer.from(request.rawBody),
				sig,
				process.env.STRIPE_WEBHOOK_SECRET as string,
			);

			const processedEvent =
				await prisma.processedWebhookEvent.findUnique({
					where: { id: event.id },
				});

			if (processedEvent) {
				return reply.send({ success: true });
			}

			const event_type = event.type;
			const data = event.data.object as StripeSubscriptionWebhookData;
			let { userId, transactionId } = data.metadata;
			const payment_intent = data.payment_intent;

			if (!payment_intent && (!userId || !transactionId)) {
				return reply.sendError(APIErrors.WEBHOOK_METADATA_MISSING);
			}

			if ((payment_intent && !userId) || !transactionId) {
				const transaction = await prisma.gemTransaction.findFirst({
					where: { transactionId: payment_intent },
				});

				if (!transaction) {
					return reply.sendError(
						APIErrors.WEBHOOK_TRANSACTION_NOT_FOUND,
					);
				}

				userId = transaction.userId.toString();
				transactionId = transaction.id.toString();
			}

			const transaction = await prisma.gemTransaction.findFirst({
				where: { id: BigInt(transactionId) },
				select: {
					id: true,
					amount: true,
					status: true,
					user: { select: { id: true, email: true } },
				},
			});

			if (!transaction) {
				return reply.sendError(APIErrors.WEBHOOK_TRANSACTION_NOT_FOUND);
			}

			let transactionStatus: TransactionStatus | undefined;
			let chargebackState: "$received" | "$won" | "$lost";
			switch (event_type) {
				// case "charge.dispute.closed":
				case "charge.dispute.created":
					transactionStatus = TransactionStatus.Disputed;
					break;
				case "charge.failed":
				case "payment_intent.payment_failed":
					transactionStatus = TransactionStatus.Failed;
					break;
				case "charge.refunded":
					transactionStatus = TransactionStatus.Refunded;
					break;
				case "charge.succeeded":
					transactionStatus = TransactionStatus.Successful;
					break;
			}

			switch (event_type) {
				case "charge.dispute.created":
					chargebackState = "$received";
					break;
				case "charge.dispute.funds_reinstated":
					chargebackState = "$won";
					break;
				case "charge.dispute.funds_withdrawn":
					chargebackState = "$lost";
					break;
			}

			if (transaction && transactionStatus) {
				await prisma.popupStatus.upsert({
					where: { userId: transaction.user.id },
					update: {
						showNoticeChargeBackDialog:
							transactionStatus === TransactionStatus.Disputed,
					},
					create: {
						id: snowflake.gen(),
						userId: transaction.user.id,
						showNoticeChargeBackDialog:
							transactionStatus === TransactionStatus.Disputed,
					},
				});

				await prisma.gemTransaction.update({
					where: { id: transaction.id },
					data: { status: transactionStatus },
				});
			}

			const balance = await prisma.gemsBalance.findFirst({
				where: { userId: transaction.user.id },
			});

			if (!balance) {
				return reply.sendError(APIErrors.WEBHOOK_BALANCE_NOT_FOUND);
			}

			await prisma.$transaction(async (prisma) => {
				if (
					transactionStatus === TransactionStatus.Successful &&
					transaction.status !== TransactionStatus.Successful
				) {
					await prisma.gemsBalance.update({
						where: { id: balance.id },
						data: { amount: { increment: transaction.amount } },
					});
				} else if (
					transactionStatus === TransactionStatus.Refunded ||
					transactionStatus === TransactionStatus.Disputed
				) {
					await prisma.gemsBalance.update({
						where: { id: balance.id },
						data: { amount: { decrement: transaction.amount } },
					});
				}

				await prisma.processedWebhookEvent.create({
					data: { id: event.id },
				});
			});

			const siftTransaction = async (
				id: string,
				user: { id: string; email: string },
				type: "$sale" | "$refund",
				amount: number,
				status: "$success" | "$failure" | "$pending",
				creator?: { id: string },
			) => {
				await siftService.transaction({
					$user_id: user.id.toString(),
					$user_email: user.email,
					$amount: amount * 10000,
					$currency_code: "USD",
					$order_id: transactionId,
					$transaction_id: id,
					$transaction_type: type,
					$transaction_status: status,
					$seller_user_id: creator?.id.toString() ?? "",
					$billing_address: {
						$name: data.billing_details?.name ?? "",
						$address_1: data.billing_details?.address?.line1 ?? "",
						$city: data.billing_details?.address?.city ?? "",
						$region: data.billing_details?.address?.state ?? "",
						$country: data.billing_details?.address?.country ?? "",
						$zipcode:
							data.billing_details?.address?.postal_code ?? "",
					},
					$payment_method: {
						$payment_type: "$credit_card",
						$payment_gateway: "$authorizenet",
						$account_holder_name: data.billing_details?.name ?? "",
						$card_last4:
							data.payment_method_details?.card?.last4 ?? "",
						$verification_status: "$success",
					},
				});
			};

			const siftChargeback = async (user: { id: string }) => {
				await siftService.chargeback({
					$user_id: user.id.toString(),
					$transaction_id: transaction.id.toString(),
					$order_id: transactionId,
					$chargeback_state: chargebackState,
				});
			};

			if (transactionStatus === TransactionStatus.Successful) {
				await siftTransaction(
					transactionId,
					{
						id: transaction.user.id.toString(),
						email: transaction.user.email,
					},
					"$sale",
					transaction.amount * 10000,
					"$success",
				);
			}

			if (transactionStatus === TransactionStatus.Failed) {
				await siftTransaction(
					transactionId,
					{
						id: transaction.user.id.toString(),
						email: transaction.user.email,
					},
					"$sale",
					transaction.amount * 10000,
					"$failure",
				);
			}

			if (transactionStatus === TransactionStatus.Refunded) {
				await siftTransaction(
					transactionId,
					{
						id: transaction.user.id.toString(),
						email: transaction.user.email,
					},
					"$refund",
					transaction.amount * 10000,
					"$success",
				);
			}

			if (transactionStatus === TransactionStatus.Disputed) {
				await siftChargeback({ id: transaction.user.id.toString() });
			}

			return reply.send({ success: true });
		},
	);

	interface PaypalWebhookEvent {
		id: string;
		event_type: string;
		resource: {
			id: string;
			supplementary_data: {
				related_ids: {
					order_id: string;
				};
			};
		};
	}

	fastify.post("/webhook/paypal", async (request, reply) => {
		if (!request.body) {
			return reply.sendError(APIErrors.WEBHOOK_PAYLOAD_MISSING);
		}

		console.log(JSON.stringify(request.body), "event");

		const webhookId = process.env.PAYPAL_WEBHOOK_ID as string;
		const transmissionId = request.headers[
			"paypal-transmission-id"
		] as string;
		const certUrl = request.headers["paypal-cert-url"] as string;
		const authAlgo = request.headers["paypal-auth-algo"] as string;
		const transmissionSig = request.headers[
			"paypal-transmission-sig"
		] as string;
		const transmissionTime = request.headers[
			"paypal-transmission-time"
		] as string;

		const webhookEventVerifyResponse =
			await paypalService.verifyWebhookEvent({
				auth_algo: authAlgo,
				cert_url: certUrl,
				transmission_id: transmissionId,
				transmission_sig: transmissionSig,
				transmission_time: transmissionTime,
				webhook_id: webhookId,
				webhook_event: request.body,
			});

		if (webhookEventVerifyResponse.data.verification_status !== "SUCCESS") {
			return reply.sendError(APIErrors.WEBHOOK_PAYLOAD_INVALID);
		}

		const event = request.body as PaypalWebhookEvent;

		const processedEvent = await prisma.processedWebhookEvent.findUnique({
			where: { id: event.id },
		});

		if (processedEvent) {
			return reply.send({ success: true });
		}

		const event_type = event.event_type;
		let transactionId;

		if (
			event.resource?.supplementary_data?.related_ids?.order_id ||
			event.resource?.id
		) {
			transactionId =
				event.resource?.supplementary_data?.related_ids?.order_id ||
				event.resource?.id;
		}

		if (!transactionId) {
			return reply.sendError(APIErrors.WEBHOOK_METADATA_MISSING);
		}

		const transaction = await prisma.gemTransaction.findFirst({
			where: { transactionId: transactionId },
		});

		if (!transaction) {
			return reply.sendError(APIErrors.WEBHOOK_TRANSACTION_NOT_FOUND);
		}

		let transactionStatus: TransactionStatus | undefined;
		switch (event_type) {
			case "PAYMENT.CAPTURE.COMPLETED":
				transactionStatus = TransactionStatus.Successful;
				break;
			case "PAYMENT.CAPTURE.DENIED":
				transactionStatus = TransactionStatus.Failed;
				break;
			case "PAYMENT.CAPTURE.REFUNDED":
				transactionStatus = TransactionStatus.Refunded;
				break;
			case "PAYMENT.CAPTURE.PENDING":
				transactionStatus = TransactionStatus.Pending;
				break;
			case "PAYMENT.AUTHORIZATION.VOIDED":
			case "CHECKOUT.ORDER.CANCELLED":
				transactionStatus = TransactionStatus.Cancelled;
				break;
			case "PAYMENT.SALE.REFUNDED":
				transactionStatus = TransactionStatus.Refunded;
				break;
			case "CUSTOMER.DISPUTE.CREATED":
				transactionStatus = TransactionStatus.Disputed;
				break;
			// case "CUSTOMER.DISPUTE.RESOLVED":
			// 	transactionStatus = TransactionStatus.Successful;
			// 	break;
			case "PAYMENT.SALE.REVERSED":
				transactionStatus = TransactionStatus.Reversed;
				break;
		}

		if (transaction && transactionStatus) {
			await prisma.popupStatus.upsert({
				where: { userId: transaction.userId },
				update: {
					showNoticeChargeBackDialog:
						transactionStatus === TransactionStatus.Disputed,
				},
				create: {
					id: snowflake.gen(),
					userId: transaction.userId,
					showNoticeChargeBackDialog:
						transactionStatus === TransactionStatus.Disputed,
				},
			});

			await prisma.gemTransaction.update({
				where: { id: transaction.id },
				data: { status: transactionStatus },
			});
		}

		const balance = await prisma.gemsBalance.findFirst({
			where: { userId: transaction.userId },
		});

		if (!balance) {
			return reply.sendError(APIErrors.WEBHOOK_BALANCE_NOT_FOUND);
		}

		await prisma.$transaction(async (prisma) => {
			if (
				transactionStatus === TransactionStatus.Successful &&
				transaction.status !== TransactionStatus.Successful
			) {
				await prisma.gemsBalance.update({
					where: { id: balance.id },
					data: { amount: { increment: transaction.amount } },
				});
			} else if (
				transactionStatus === TransactionStatus.Refunded ||
				transactionStatus === TransactionStatus.Disputed
			) {
				await prisma.gemsBalance.update({
					where: { id: balance.id },
					data: { amount: { decrement: transaction.amount } },
				});
			}

			await prisma.processedWebhookEvent.create({
				data: { id: event.id },
			});
		});

		return reply.send({ success: true });
	});

	interface AuthorizeNetWebhookEvent {
		eventType: string;
		notificationId: string;
		payload: {
			id: string;
			responseCode: number;
			authAmount: number;
		};
	}

	fastify.post(
		"/webhook/authorize-net",
		{
			config: {
				rawBody: true,
			},
		},
		async (request, reply) => {
			if (!request.body) {
				return reply.send({ success: true }); // ignore
			}

			const xAnetSignature = request.headers[
				"x-anet-signature"
			] as string;

			const isValid = authorizeNetService.verifyWebhookEvent({
				headers: {
					"x-anet-signature": xAnetSignature,
				},
				rawBody: request.rawBody as Buffer,
			});

			if (!isValid) {
				return reply.send({ success: true }); // ignore
			}

			const event = request.body as AuthorizeNetWebhookEvent;

			const processedEvent =
				await prisma.processedWebhookEvent.findUnique({
					where: { id: event.notificationId },
				});

			if (processedEvent) {
				return reply.send({ success: true }); // ignore
			}

			const eventType = event.eventType;
			let status: TransactionStatus | undefined;
			let chargebackState: "$received" | "$won" | "$lost";
			switch (eventType) {
				case "net.authorize.payment.authorization.created":
					status = TransactionStatus.Pending;
					break;
				case "net.authorize.payment.authcapture.created":
					status = TransactionStatus.Successful;
					break;
				case "net.authorize.payment.capture.created":
					status = TransactionStatus.Successful;
					break;
				case "net.authorize.payment.void.created":
					status = TransactionStatus.Failed;
					break;
				case "net.authorize.payment.refund.created":
					status = TransactionStatus.Refunded;
					break;
				// case "net.authorize.payment.fraud.approved":
				// case "net.authorize.payment.fraud.declined":
				case "net.authorize.payment.fraud.held":
					status = TransactionStatus.Disputed;
					break;
			}

			switch (eventType) {
				case "net.authorize.payment.fraud.approved":
					chargebackState = "$won";
					break;
				case "net.authorize.payment.fraud.declined":
					chargebackState = "$lost";
					break;
				case "net.authorize.payment.fraud.held":
					chargebackState = "$received";
					break;
			}

			const transactionId = event.payload.id;

			if (!transactionId) {
				return reply.send({ success: true }); //ignore
			}

			const transactionDetails =
				await authorizeNetService.getTransactionDetails(transactionId);

			const refTransId =
				transactionDetails?.transaction?.refTransId || transactionId;

			const firstPaymentSubscription =
				await prisma.paymentSubscription.findFirst({
					where: { firstPaymentTransactionId: refTransId as string },
				});

			let paymentSubscriptionTransaction =
				await prisma.paymentSubscriptionTransaction.findFirst({
					where: {
						transactionId: refTransId,
					},
				});

			const transaction = transactionDetails?.transaction;
			const subscriptionId =
				transaction?.subscription?.id ||
				firstPaymentSubscription?.transactionId;

			const siftTransaction = async (
				transactionId: string,
				user: { id: string; email: string },
				type: "$sale" | "$refund",
				amount: number,
				status: "$success" | "$failure" | "$pending",
				creator?: { id: string },
			) => {
				await siftService.transaction({
					$user_id: user.id.toString(),
					$user_email: user.email,
					$amount: amount * 10000,
					$currency_code: "USD",
					$order_id: refTransId,
					$transaction_id: transactionId,
					$transaction_type: type,
					$transaction_status: status,
					$seller_user_id: creator?.id.toString() ?? "",
					$billing_address: {
						$name:
							transaction.billTo.firstName +
							" " +
							transaction.billTo.lastName,
						$address_1: transaction.billTo.address,
						$city: transaction.billTo.city,
						$region: transaction.billTo.state,
						$country: transaction.billTo.country,
						$zipcode: transaction.billTo.zip,
					},
					$payment_method: {
						$payment_type: "$credit_card",
						$payment_gateway: "$authorizenet",
						$account_holder_name:
							transaction.billTo.firstName +
							" " +
							transaction.billTo.lastName,
						$card_last4:
							transaction.payment.creditCard.cardNumber.slice(-4),
						$verification_status: "$success",
					},
				});
			};

			const siftChargeback = async (user: { id: string }) => {
				await siftService.chargeback({
					$user_id: user.id.toString(),
					$transaction_id: transaction.id.toString(),
					$order_id: refTransId,
					$chargeback_state: chargebackState,
				});
			};

			if (paymentSubscriptionTransaction) {
				await prisma.paymentSubscriptionTransaction.update({
					where: {
						id: paymentSubscriptionTransaction.id,
					},
					data: {
						status: status,
						error:
							event.payload.responseCode !== 1
								? transaction?.responseReasonDescription
								: undefined,
					},
				});
			}

			if (subscriptionId) {
				const paymentSubscription =
					await prisma.paymentSubscription.findFirst({
						where: { transactionId: subscriptionId.toString() },
						select: {
							id: true,
							transactionId: true,
							creator: {
								select: {
									platformFee: true,
									displayName: true,
									user: {
										select: {
											email: true,
											username: true,
										},
									},
									notificationsSettings: true,
								},
							},
							creatorId: true,
							userId: true,
							user: {
								select: {
									email: true,
									displayName: true,
									username: true,
									notificationsSettings: true,
								},
							},
							amount: true,
							startDate: true,
							fanReferralCode: true,
						},
					});

				if (!paymentSubscription) {
					return reply.send({ success: true }); //ignore
				}

				if (firstPaymentSubscription) {
					await prisma.paymentSubscription.update({
						where: { id: paymentSubscription.id },
						data: {
							status:
								status === TransactionStatus.Successful
									? SubscriptionStatus.Active
									: status,
							endDate:
								status !== TransactionStatus.Successful
									? new Date()
									: undefined,
						},
					});

					if (
						paymentSubscription.transactionId &&
						status !== TransactionStatus.Pending &&
						status !== TransactionStatus.Successful
					) {
						await authorizeNetService.cancelSubscription(
							paymentSubscription.transactionId,
						);
					}
				}

				if (status) {
					if (!paymentSubscriptionTransaction) {
						paymentSubscriptionTransaction =
							await prisma.paymentSubscriptionTransaction.create({
								data: {
									id: snowflake.gen(),
									userId: paymentSubscription.userId,
									creatorId: paymentSubscription.creatorId,
									paymentSubscriptionId:
										paymentSubscription.id,
									transactionId: refTransId,
									amount:
										event.payload.authAmount *
										DECIMAL_TO_CENT_FACTOR,
									currency: "USD",
									status: status,
									error:
										event.payload.responseCode !== 1
											? transaction?.responseReasonDescription
											: undefined,
								},
							});
					}

					if (status === TransactionStatus.Successful) {
						await prisma.$transaction(async (prisma) => {
							const creatorBalance =
								await prisma.balance.findFirst({
									where: {
										profileId:
											paymentSubscription.creatorId,
									},
								});

							const { netAmount } =
								feesCalculator.creatorSubscriptionsTransactionFee(
									paymentSubscription.amount,
									paymentSubscription.creator.platformFee,
								);
							const fanReferral =
								paymentSubscription.fanReferralCode
									? await prisma.fanReferral.findFirst({
											where: {
												code: paymentSubscription.fanReferralCode,
											},
											include: { profile: true },
									  })
									: undefined;

							if (
								paymentSubscriptionTransaction &&
								fanReferral &&
								fanReferral.profile
							) {
								const referentId = paymentSubscription.userId;
								const referrerId = fanReferral.userId;
								const fanReferralShare =
									fanReferral.profile.fanReferralShare;
								const referralAmount =
									(netAmount.getAmount() * fanReferralShare) /
									100;

								const referrerGemsBalance =
									await prisma.gemsBalance.findFirst({
										where: { userId: BigInt(referrerId) },
									});

								await prisma.balance.update({
									where: { id: creatorBalance?.id },
									data: {
										amount: {
											increment:
												netAmount.getAmount() -
												referralAmount,
										},
									},
								});

								await prisma.gemsBalance.update({
									where: { id: referrerGemsBalance?.id },
									data: {
										amount: { increment: referralAmount },
									},
								});

								await prisma.fanReferralTransaction.create({
									data: {
										id: snowflake.gen(),
										referentId: referentId,
										referrerId: referrerId,
										creatorId:
											paymentSubscription.creatorId,
										fanReferralId: fanReferral.id,
										type: FanReferralTransactionType.Subscription,
										transactionId:
											paymentSubscriptionTransaction.id,
										amount: referralAmount,
									},
								});

								await prisma.fanReferral.update({
									where: { id: fanReferral.id },
									data: { visitCount: { increment: 1 } },
								});
							} else {
								await prisma.balance.update({
									where: { id: creatorBalance?.id },
									data: {
										amount: {
											increment: netAmount.getAmount(),
										},
									},
								});
							}
						});

						const creator = await prisma.profile.findFirst({
							where: { id: paymentSubscription.creatorId },
							select: {
								id: true,
								referrerCode: true,
								displayName: true,
								user: {
									select: { email: true, username: true },
								},
							},
						});

						if (creator?.referrerCode) {
							await processCreatorReferralFee(
								creator.referrerCode,
								creator.id.toString(),
								"Subscription",
								paymentSubscription.amount,
								paymentSubscriptionTransaction.id.toString(),
							);
						}

						if (
							paymentSubscription.creator?.notificationsSettings
								?.transactionFanEmail
						) {
							await emailTemplateSenderService.sendSubscriptionConfirmation(
								paymentSubscription.user.email,
								{
									fanName:
										paymentSubscription.user.displayName ??
										paymentSubscription.user.username ??
										"",
									creatorName:
										paymentSubscription.creator
											.displayName ??
										paymentSubscription.creator.user!
											.username ??
										"",
									amount: formatPriceForNotification(
										dinero({
											amount: paymentSubscription.amount,
										}),
									),
								},
							);
						}

						if (
							paymentSubscription.creator?.notificationsSettings
								?.newSubscriberCreatorEmail
						) {
							await emailTemplateSenderService.sendNewSubscriptionAlert(
								paymentSubscription.creator.user!.email,
								{
									fanName:
										paymentSubscription.user.displayName ??
										paymentSubscription.user.username ??
										"",
									creatorName:
										paymentSubscription.creator
											.displayName ??
										paymentSubscription.creator.user!
											.username ??
										"",
								},
							);
						}

						// await xpService.addXPLog(
						//  "Subscribe",
						//  paymentSubscription.amount,
						//  paymentSubscription.userId,
						//  paymentSubscription.creatorId,
						// );

						await payoutService
							.processPayout(paymentSubscription.creatorId)
							.catch(() => void 0);
					}

					await prisma.popupStatus.upsert({
						where: { userId: paymentSubscription.userId },
						update: {
							showNoticeChargeBackDialog:
								status === TransactionStatus.Disputed,
							showManageSubscriptionDialog:
								status === TransactionStatus.Successful,
						},

						create: {
							id: snowflake.gen(),
							userId: paymentSubscription.userId,
							showNoticeChargeBackDialog:
								status === TransactionStatus.Disputed,
							showManageSubscriptionDialog:
								status === TransactionStatus.Successful,
						},
					});

					if (status === TransactionStatus.Successful) {
						await siftTransaction(
							paymentSubscriptionTransaction.id.toString(),
							{
								id: paymentSubscription.userId.toString(),
								email: paymentSubscription.user.email,
							},
							"$sale",
							paymentSubscriptionTransaction.amount,
							"$success",
							{
								id: paymentSubscription.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Disputed) {
						await siftChargeback({
							id: paymentSubscription.userId.toString(),
						});

						if (
							paymentSubscription.creator?.notificationsSettings
								?.chargebackCreatorEmail
						) {
							await emailTemplateSenderService.sendChargebackNoticeToCreator(
								paymentSubscription.creator.user!.email,
								{
									fanName:
										paymentSubscription.user.displayName ??
										paymentSubscription.user.username ??
										"",
									creatorName:
										paymentSubscription.creator
											.displayName ??
										paymentSubscription.creator.user!
											.username ??
										"",
									transactionAmount:
										formatPriceForNotification(
											dinero({
												amount: paymentSubscription.amount,
											}),
										),
								},
							);
						}

						if (
							paymentSubscription.creator?.notificationsSettings
								?.chargebackCreatorInApp
						) {
							await notification.createNotification(
								paymentSubscription.creatorId,
								{
									type: NotificationType.ChargebackNoticeCreator,
									users: [paymentSubscription.userId],
								},
							);
						}

						if (
							paymentSubscription.user?.notificationsSettings
								?.chargebackFanEmail
						) {
							await emailTemplateSenderService.sendChargebackNotice(
								paymentSubscription.user.email,
								{
									fanName:
										paymentSubscription.user.displayName ??
										paymentSubscription.user.username ??
										"",
									creatorName:
										paymentSubscription.creator
											.displayName ??
										paymentSubscription.creator.user!
											.username ??
										"",
									transactionAmount:
										formatPriceForNotification(
											dinero({
												amount: paymentSubscription.amount,
											}),
										),
								},
							);
						}

						if (
							paymentSubscription.user?.notificationsSettings
								?.chargebackFanInApp
						) {
							await notification.createNotification(
								paymentSubscription.userId,
								{
									type: NotificationType.ChargebackNoticeFan,
								},
							);
						}
					}

					if (status === TransactionStatus.Refunded) {
						await siftTransaction(
							paymentSubscriptionTransaction.id.toString(),
							{
								id: paymentSubscription.userId.toString(),
								email: paymentSubscription.user.email,
							},
							"$refund",
							paymentSubscriptionTransaction.amount,
							"$success",
							{
								id: paymentSubscription.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Failed) {
						await siftTransaction(
							paymentSubscriptionTransaction.id.toString(),

							{
								id: paymentSubscription.userId.toString(),
								email: paymentSubscription.user.email,
							},
							"$sale",
							paymentSubscriptionTransaction.amount,
							"$failure",
							{
								id: paymentSubscription.creatorId.toString(),
							},
						);
					}
				}

				await prisma.processedWebhookEvent.create({
					data: { id: event.notificationId },
				});

				return reply.send({ success: true });
			} else if (!paymentSubscriptionTransaction) {
				const [gemTransaction, paidPostTransaction, cameoPayment] =
					await Promise.all([
						prisma.gemTransaction.findUnique({
							where: { transactionId: refTransId },
							select: {
								id: true,
								userId: true,
								user: { select: { email: true } },
								amount: true,
								status: true,
							},
						}),
						prisma.paidPostTransaction.findUnique({
							where: { transactionId: refTransId },
							select: {
								id: true,
								userId: true,
								user: { select: { email: true } },
								creator: true,
								creatorId: true,
								amount: true,
								status: true,
								fanReferralCode: true,
							},
						}),
						prisma.cameoPayment.findUnique({
							where: { transactionId: refTransId },
							select: {
								id: true,
								userId: true,
								user: { select: { email: true } },
								creator: true,
								creatorId: true,
								amount: true,
								status: true,
							},
						}),
					]);

				if (!gemTransaction && !paidPostTransaction && !cameoPayment) {
					return reply.send({ success: true }); // ignore
				}

				if (gemTransaction) {
					if (status) {
						if (status === TransactionStatus.Disputed) {
							await prisma.popupStatus.upsert({
								where: { userId: gemTransaction.userId },
								update: {
									showNoticeChargeBackDialog: true,
								},

								create: {
									id: snowflake.gen(),
									userId: gemTransaction.userId,
									showNoticeChargeBackDialog: true,
								},
							});
						}

						await prisma.gemTransaction.update({
							where: { id: gemTransaction.id },
							data: { status: status },
						});
					}

					const balance = await prisma.gemsBalance.findFirst({
						where: { userId: gemTransaction.userId },
					});

					if (!balance) {
						return reply.send({ success: true }); // ignore
					}

					await prisma.$transaction(async (prisma) => {
						if (
							status === TransactionStatus.Successful &&
							gemTransaction.status !==
								TransactionStatus.Successful
						) {
							await prisma.gemsBalance.update({
								where: { id: balance.id },
								data: {
									amount: {
										increment: gemTransaction.amount,
									},
								},
							});
						} else if (
							status === TransactionStatus.Refunded ||
							status === TransactionStatus.Disputed
						) {
							await prisma.gemsBalance.update({
								where: { id: balance.id },
								data: {
									amount: {
										decrement: gemTransaction.amount,
									},
								},
							});
						}

						await prisma.processedWebhookEvent.create({
							data: { id: event.notificationId },
						});
					});

					if (status === TransactionStatus.Successful) {
						await siftTransaction(
							gemTransaction.id.toString(),

							{
								id: gemTransaction.userId.toString(),
								email: gemTransaction.user.email,
							},
							"$sale",
							gemTransaction.amount,
							"$success",
						);
					}

					if (status === TransactionStatus.Failed) {
						await siftTransaction(
							gemTransaction.id.toString(),

							{
								id: gemTransaction.userId.toString(),
								email: gemTransaction.user.email,
							},
							"$sale",
							gemTransaction.amount,
							"$failure",
						);
					}

					if (status === TransactionStatus.Refunded) {
						await siftTransaction(
							gemTransaction.id.toString(),

							{
								id: gemTransaction.userId.toString(),
								email: gemTransaction.user.email,
							},
							"$refund",
							gemTransaction.amount,
							"$success",
						);
					}

					if (status === TransactionStatus.Disputed) {
						await siftChargeback({
							id: gemTransaction.userId.toString(),
						});
					}
				} else if (paidPostTransaction) {
					if (status) {
						await prisma.popupStatus.upsert({
							where: { userId: paidPostTransaction.userId },
							update: {
								showNoticeChargeBackDialog:
									status === TransactionStatus.Disputed,
							},

							create: {
								id: snowflake.gen(),
								userId: paidPostTransaction.userId,
								showNoticeChargeBackDialog:
									status === TransactionStatus.Disputed,
							},
						});

						await prisma.paidPostTransaction.update({
							where: { id: paidPostTransaction.id },
							data: { status: status },
						});

						if (
							status === TransactionStatus.Successful &&
							paidPostTransaction.status !==
								TransactionStatus.Successful
						) {
							await prisma.$transaction(async (prisma) => {
								const creatorBalance =
									await prisma.balance.findFirst({
										where: {
											profileId:
												paidPostTransaction.creatorId,
										},
									});
								const fanReferral =
									paidPostTransaction.fanReferralCode
										? await prisma.fanReferral.findFirst({
												where: {
													code: paidPostTransaction.fanReferralCode,
												},
												include: { profile: true },
										  })
										: undefined;
								const [
									fanReferrerGemsBalance,
									fanReferrerBalance,
								] = [
									await prisma.gemsBalance.findFirst({
										where: { userId: fanReferral?.userId },
									}),
									await prisma.balance.findFirst({
										where: {
											profile: {
												userId: fanReferral?.userId,
											},
										},
									}),
								];

								const { netAmount } =
									feesCalculator.creatorPaidPostTransactionFee(
										paidPostTransaction.amount,
										paidPostTransaction.creator.platformFee,
									);

								if (
									paidPostTransaction.fanReferralCode &&
									fanReferral
								) {
									const fanReferralAmount =
										netAmount.getAmount() *
										fanReferral.profile.fanReferralShare;
									if (fanReferrerBalance) {
										await prisma.balance.update({
											where: {
												id: fanReferrerBalance.id,
											},
											data: {
												amount: {
													increment:
														fanReferralAmount,
												},
											},
										});
									} else {
										await prisma.gemsBalance.update({
											where: {
												id: fanReferrerGemsBalance?.id,
											},
											data: {
												amount: {
													increment:
														fanReferralAmount,
												},
											},
										});
									}

									await prisma.balance.update({
										where: { id: creatorBalance?.id },
										data: {
											amount: {
												increment:
													netAmount.getAmount() -
													fanReferralAmount,
											},
										},
									});

									await prisma.fanReferralTransaction.create({
										data: {
											id: snowflake.gen(),
											referentId:
												paidPostTransaction.userId,
											referrerId: fanReferral.userId,
											creatorId:
												paidPostTransaction.creatorId,
											fanReferralId: fanReferral.id,
											type: FanReferralTransactionType.PaidPost,
											transactionId:
												paidPostTransaction.id,
											amount: fanReferralAmount,
										},
									});

									await prisma.fanReferral.update({
										where: { id: fanReferral.id },
										data: { visitCount: { increment: 1 } },
									});
								} else {
									await prisma.balance.update({
										where: { id: creatorBalance?.id },
										data: {
											amount: {
												increment:
													netAmount.getAmount(),
											},
										},
									});
								}
							});

							const creator = await prisma.profile.findFirst({
								where: { id: paidPostTransaction.creatorId },
							});
							if (creator?.referrerCode) {
								await processCreatorReferralFee(
									creator.referrerCode,
									creator.id.toString(),
									"PaidPost",
									paidPostTransaction.amount,
									paidPostTransaction.id.toString(),
								);
							}
							(async () => {
								const creator = await prisma.profile.findUnique(
									{
										where: {
											id: paidPostTransaction.creatorId,
										},
										select: {
											userId: true,
											notificationsSettings: true,
										},
									},
								);

								if (!creator) return;

								const dineroAmount = dinero({
									amount: paidPostTransaction.amount,
								});

								if (
									creator.notificationsSettings
										?.paidPostCreatorInApp
								) {
									await notification.createNotification(
										creator.userId,
										{
											type: NotificationType.PaidPostPurchase,
											users: [paidPostTransaction.userId],
											price: formatPriceForNotification(
												dineroAmount,
											),
										},
									);
								}
							})();

							// await xpService.addXPLog(
							//  "Purchase",
							//  paidPostTransaction.amount,
							//  paidPostTransaction.userId,
							//  paidPostTransaction.creatorId,
							// );
						}
					}

					if (status === TransactionStatus.Successful) {
						await siftTransaction(
							paidPostTransaction.id.toString(),
							{
								id: paidPostTransaction.userId.toString(),
								email: paidPostTransaction.user.email,
							},
							"$sale",
							paidPostTransaction.amount,
							"$success",
							{
								id: paidPostTransaction.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Failed) {
						await siftTransaction(
							paidPostTransaction.id.toString(),
							{
								id: paidPostTransaction.userId.toString(),
								email: paidPostTransaction.user.email,
							},
							"$sale",
							paidPostTransaction.amount,
							"$failure",
							{
								id: paidPostTransaction.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Refunded) {
						await siftTransaction(
							paidPostTransaction.id.toString(),
							{
								id: paidPostTransaction.userId.toString(),
								email: paidPostTransaction.user.email,
							},
							"$refund",
							paidPostTransaction.amount,
							"$success",
							{
								id: paidPostTransaction.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Disputed) {
						await siftChargeback({
							id: paidPostTransaction.userId.toString(),
						});
					}
				} else if (cameoPayment) {
					if (status) {
						await prisma.popupStatus.upsert({
							where: { userId: cameoPayment.userId },
							update: {
								showNoticeChargeBackDialog:
									status === TransactionStatus.Disputed,
							},
							create: {
								id: snowflake.gen(),
								userId: cameoPayment.userId,
								showNoticeChargeBackDialog:
									status === TransactionStatus.Disputed,
							},
						});

						await prisma.cameoPayment.update({
							where: { id: cameoPayment.id },
							data: { status: status },
						});

						if (
							status === TransactionStatus.Successful &&
							cameoPayment.status !== TransactionStatus.Successful
						) {
							await prisma.$transaction(async (prisma) => {
								const creatorBalance =
									await prisma.balance.findFirst({
										where: {
											profileId: cameoPayment.creatorId,
										},
									});

								const { netAmount } =
									feesCalculator.creatorCameoPaymentFee(
										cameoPayment.amount,
										cameoPayment.creator.platformFee,
									);

								await prisma.balance.update({
									where: { id: creatorBalance?.id },
									data: {
										amount: {
											increment: netAmount.getAmount(),
										},
									},
								});
							});

							// await xpService.addXPLog(
							//  "Purchase",
							//  cameoPayment.amount,
							//  cameoPayment.userId,
							//  cameoPayment.creatorId,
							// );
						}
					}

					if (status === TransactionStatus.Successful) {
						await siftTransaction(
							cameoPayment.id.toString(),
							{
								id: cameoPayment.userId.toString(),
								email: cameoPayment.user.email,
							},
							"$sale",
							cameoPayment.amount,
							"$success",
							{
								id: cameoPayment.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Failed) {
						await siftTransaction(
							cameoPayment.id.toString(),
							{
								id: cameoPayment.userId.toString(),
								email: cameoPayment.user.email,
							},
							"$sale",
							cameoPayment.amount,
							"$failure",
							{
								id: cameoPayment.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Refunded) {
						await siftTransaction(
							cameoPayment.id.toString(),
							{
								id: cameoPayment.userId.toString(),
								email: cameoPayment.user.email,
							},
							"$refund",
							cameoPayment.amount,
							"$success",
							{
								id: cameoPayment.creatorId.toString(),
							},
						);
					}

					if (status === TransactionStatus.Disputed) {
						await siftChargeback({
							id: cameoPayment.userId.toString(),
						});
					}
				}
			}

			return reply.send({ success: true });
		},
	);
}
