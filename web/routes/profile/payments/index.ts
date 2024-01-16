import { FastifyPluginOptions } from "fastify";
import { FastifyTypebox } from "../../../types.js";
import { SubscriptionStatus } from "@prisma/client";
import Dinero from "dinero.js";

import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import APIErrors from "../../../errors/index.js";
import AuthorizeNetService from "../../../../common/service/AuthorizeNetService.js";
import SiftService from "../../../../common/service/SiftService.js";

import { PaymentMethod } from "../../../CommonAPISchemas.js";

import {
	PaymentMethodReqBody,
	UpdatePaymentMethodReqBody,
	TransactionReqQueryParams,
	FetchPaymentMethodReqBody,
	DeletePaymentMethodReqBody,
} from "./schemas.js";
import {
	PaymentMethodReqBodyValidator,
	UpdatePaymentMethodReqBodyValidator,
	TransactionReqQueryParamsValidator,
	FetchPaymentMethodReqBodyValidator,
	DeletePaymentMethodReqBodyValidator,
} from "./validation.js";

const DECIMAL_TO_CENT_FACTOR = 100;

export default async function routes(
	fastify: FastifyTypebox,
	options: FastifyPluginOptions,
) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);
	const authorizeNetService = await container.resolve(AuthorizeNetService);
	const siftService = await container.resolve(SiftService);

	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.get<{
		Querystring: FetchPaymentMethodReqBody;
	}>(
		"/payment-method",
		{
			schema: {
				querystring: FetchPaymentMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { paymentMethodId, customerPaymentProfileId } = request.query;

			const session = request.session!;

			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					id: BigInt(paymentMethodId),
					userId: BigInt(session.userId),
				},
			});

			if (!paymentMethod) {
				return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
			}

			const paymentProfileResponse =
				await authorizeNetService.fetchCustomerPaymentProfile(
					paymentMethod.token,
					customerPaymentProfileId,
				);

			if (paymentProfileResponse.getMessages().getResultCode() !== "Ok") {
				return reply.sendError(
					APIErrors.PAYMENT_METHOD_FETCH_FAILED(
						paymentProfileResponse
							.getMessages()
							.getMessage()[0]
							.getText(),
					),
				);
			}

			reply.status(201).send({
				cardNumber:
					paymentProfileResponse.paymentProfile.payment.creditCard
						.cardNumber,
				expirationDate:
					paymentProfileResponse.paymentProfile.payment.creditCard
						.expirationDate,
				cardType:
					paymentProfileResponse.paymentProfile.payment.creditCard
						.cardType,
				...paymentProfileResponse.paymentProfile.billTo,
			});
		},
	);

	fastify.get(
		"/payment-methods",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					userId: user.id,
					provider: "AuthorizeNet",
				},
			});

			if (!paymentMethod) {
				return reply.sendError(APIErrors.PAYMENT_METHODS_NOT_FOUND);
			}

			const customerProfileResponse =
				await authorizeNetService.fetchCustomerProfile(
					paymentMethod.token,
				);

			if (
				customerProfileResponse.getMessages().getResultCode() !== "Ok"
			) {
				return reply.sendError(
					APIErrors.PAYMENT_METHOD_FETCH_FAILED(
						customerProfileResponse
							.getMessages()
							.getMessage()[0]
							.getText(),
					),
				);
			}

			const paymentProfiles =
				customerProfileResponse.profile.paymentProfiles.map(
					(profile: any) => ({
						id: paymentMethod.id,
						customerPaymentProfileId:
							profile.customerPaymentProfileId,
						cardNumber: profile.payment.creditCard.cardNumber,
						expirationDate:
							profile.payment.creditCard.expirationDate,
						cardType: profile.payment.creditCard.cardType,
					}),
				) as PaymentMethod[];

			return reply.status(200).send(paymentProfiles);
		},
	);

	const siftUpdatePaymentMethods = async (
		userId: string,
		token: string,
		customerInformation?: {
			firstName: string;
			lastName: string;
			country: string;
			address: string;
			city: string;
			state: string;
			zip: string;
		},
	) => {
		const customerProfileResponse =
			await authorizeNetService.fetchCustomerProfile(token);

		await siftService.updateAccount({
			$user_id: userId,
			$billing_address: {
				$name:
					customerInformation?.firstName +
						" " +
						customerInformation?.lastName ?? "",
				$address_1: customerInformation?.address ?? "",
				$city: customerInformation?.city ?? "",
				$region: customerInformation?.state ?? "",
				$country: customerInformation?.country ?? "",
				$zipcode: customerInformation?.zip ?? "",
			},
			$payment_methods:
				customerProfileResponse.profile.paymentProfiles.map(
					(profile: any) => ({
						$payment_type: "$credit_card",
						$payment_gateway: "$authorizenet",
						$account_holder_name:
							profile.billTo.firstName +
							" " +
							profile.billTo.lastName,
						$card_last4:
							profile.payment.creditCard.cardNumber.slice(-4),
						$verification_status: "$success",
					}),
				),
		});
	};

	fastify.post<{ Body: PaymentMethodReqBody }>(
		"/payment-method",
		{
			schema: {
				body: PaymentMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { opaqueDataValue, customerInformation } = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);

			const paymentMethodCount = await prisma.paymentMethod.count({
				where: {
					userId: BigInt(session.userId),
				},
			});

			if (paymentMethodCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			let paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					userId: user.id,
					provider: "AuthorizeNet",
				},
			});

			await new Promise((resolve) => setTimeout(resolve, 5000));

			if (paymentMethod) {
				const appendPaymentMethodResponse =
					await authorizeNetService.appendPaymentMethodToCustomerProfile(
						{
							customerProfileId: paymentMethod.token,
							opaqueDataValue,
							customerData: {
								email: user.email,
								firstName: customerInformation.firstName,
								lastName: customerInformation.lastName,
								country: customerInformation.country,
								address: customerInformation.address,
								city: customerInformation.city,
								state: customerInformation.state,
								zip: customerInformation.zip,
							},
						},
					);

				if (appendPaymentMethodResponse.messages.resultCode !== "Ok") {
					reply.sendError(
						APIErrors.PAYMENT_FAILED(
							appendPaymentMethodResponse.messages.message[0]
								.text,
						),
					);
					return;
				}
			} else {
				const customer =
					await authorizeNetService.createCustomerProfile({
						opaqueDataValue,
						customerData: {
							email: user.email,
							firstName: customerInformation.firstName,
							lastName: customerInformation.lastName,
							country: customerInformation.country,
							address: customerInformation.address,
							city: customerInformation.city,
							state: customerInformation.state,
							zip: customerInformation.zip,
						},
					});

				if (customer.messages.resultCode !== "Ok") {
					reply.sendError(
						APIErrors.PAYMENT_FAILED(
							customer.messages.message[0].text,
						),
					);
					return;
				}

				const customerProfileId = customer.customerProfileId;

				paymentMethod = await prisma.paymentMethod.create({
					data: {
						id: snowflake.gen(),
						userId: user.id,
						provider: "AuthorizeNet",
						token: customerProfileId,
					},
				});
			}

			(async () => {
				await siftUpdatePaymentMethods(
					user.id.toString(),
					paymentMethod!.token,
					customerInformation,
				);
			})();

			reply.status(200).send({ paymentMethod });
		},
	);

	fastify.put<{ Body: UpdatePaymentMethodReqBody }>(
		"/payment-method",
		{
			schema: {
				body: UpdatePaymentMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const {
				customerPaymentProfileId,
				opaqueDataValue,
				customerInformation,
			} = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);

			const paymentMethodCount = await prisma.paymentMethod.count({
				where: {
					userId: BigInt(session.userId),
				},
			});

			if (paymentMethodCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					userId: user.id,
					provider: "AuthorizeNet",
				},
			});

			if (!paymentMethod) {
				reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				return;
			}

			const appendPaymentMethodResponse =
				await authorizeNetService.updatePaymentMethodToCustomerProfile({
					customerProfileId: paymentMethod.token,
					customerPaymentProfileId: customerPaymentProfileId,
					opaqueDataValue,
					customerData: {
						firstName: customerInformation.firstName,
						lastName: customerInformation.lastName,
						country: customerInformation.country,
						address: customerInformation.address,
						city: customerInformation.city,
						state: customerInformation.state,
						zip: customerInformation.zip,
					},
				});

			if (appendPaymentMethodResponse.messages.resultCode !== "Ok") {
				reply.sendError(
					APIErrors.PAYMENT_FAILED(
						appendPaymentMethodResponse.messages.message[0].text,
					),
				);
				return;
			}

			(async () => {
				await siftUpdatePaymentMethods(
					user.id.toString(),
					paymentMethod!.token,
					customerInformation,
				);
			})();

			reply.status(200).send({ paymentMethod });
		},
	);

	fastify.delete<{
		Body: DeletePaymentMethodReqBody;
	}>(
		"/payment-method",
		{
			schema: {
				body: DeletePaymentMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const { paymentMethodId, customerPaymentProfileId } = request.body;

			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					id: BigInt(paymentMethodId),
					userId: BigInt(session.userId),
				},
			});

			if (!paymentMethod) {
				return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
			}

			const usedPaymentMethod =
				await authorizeNetService.fetchCustomerPaymentProfile(
					paymentMethod.token,
					customerPaymentProfileId,
				);

			const subscriptionIdArray =
				usedPaymentMethod.paymentProfile.subscriptionIds
					?.subscriptionId;

			if (subscriptionIdArray && subscriptionIdArray.length > 0) {
				return reply.sendError(
					APIErrors.PAYMENT_METHOD_DELETE_FAILED(
						"The specified payment method is associated with an active or suspended subscription and cannot be deleted.",
					),
				);
			}

			const deletePaymentProfileResponse =
				await authorizeNetService.deleteCustomerPaymentProfile(
					paymentMethod.token,
					customerPaymentProfileId,
				);

			if (
				deletePaymentProfileResponse.getMessages().getResultCode() !==
				"Ok"
			) {
				return reply.sendError(
					APIErrors.PAYMENT_METHOD_DELETE_FAILED(
						deletePaymentProfileResponse
							.getMessages()
							.getMessage()[0]
							.getText(),
					),
				);
			}

			(async () => {
				await siftUpdatePaymentMethods(
					user.id.toString(),
					paymentMethod!.token,
				);
			})();

			reply.status(200).send({ message: "Card deleted successfully." });
		},
	);

	fastify.get<{
		Querystring: TransactionReqQueryParams;
	}>(
		"/user-transactions",
		{
			schema: {
				querystring: TransactionReqQueryParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const { page = 1, limit = 7, search = "" } = request.query;

			const gemTransactions = await prisma.gemTransaction.findMany({
				where: {
					userId: user.id,
					OR: [
						{
							provider: {
								not: "Stripe",
							},
						},
						{
							provider: "Stripe",
							status: {
								notIn: ["Submitted", "Initialized"],
							},
						},
					],
				},
			});

			const gemSpendingLogs = await prisma.gemsSpendingLog.findMany({
				where: { spenderId: user.id },
				include: { spender: true, creator: true },
			});

			const paymentSubscriptionTransactions =
				await prisma.paymentSubscriptionTransaction.findMany({
					where: { userId: user.id },
					include: {
						user: true,
						creator: true,
						paymentSubscription: true,
					},
				});

			const paidPostTransactions =
				await prisma.paidPostTransaction.findMany({
					where: { userId: user.id },
					include: {
						user: true,
						creator: true,
						paidPost: true,
					},
				});

			const cameoPayments = await prisma.cameoPayment.findMany({
				where: { userId: user.id },
				include: {
					user: true,
					creator: true,
				},
			});

			const transactions = [];

			for (const gemTransaction of gemTransactions) {
				const amount = Dinero({
					amount: gemTransaction.amount,
				});
				const processingFee = Dinero({
					amount: gemTransaction.processingFee,
				});
				const platformFee = Dinero({
					amount: gemTransaction.platformFee,
				});
				const totalFee = processingFee.add(platformFee);
				const total = amount.add(processingFee).add(platformFee);
				transactions.push({
					id: gemTransaction.id,
					creator: {
						id: user.id,
						username: user.username,
						displayName: user.displayName,
						avatar: user.avatar,
					},
					description: `Gem Purchase ${gemTransaction.status}`,
					status: gemTransaction.status,
					date: gemTransaction.updatedAt,
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee:
						processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					platformFee:
						platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					totalFee: totalFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					total: total.getAmount() / DECIMAL_TO_CENT_FACTOR,
				});
			}

			for (const spendingLog of gemSpendingLogs) {
				const amount = Dinero({
					amount: spendingLog.amount,
				});

				transactions.push({
					id: spendingLog.id,
					creator: {
						id: spendingLog.creatorId,
						username: spendingLog.creator.profileLink
							?.split("/")
							.slice(-1)[0],
						displayName: spendingLog.creator.displayName,
						avatar: spendingLog.creator.avatar,
					},
					description: `${spendingLog.type} Successful`,
					status: "Successful",
					date: spendingLog.updatedAt,
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee: 0,
					platformFee: 0,
					totalFee: 0,
					total: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				});
			}

			for (const paymentSubscriptionTransaction of paymentSubscriptionTransactions) {
				const { paymentSubscription } = paymentSubscriptionTransaction;
				const amount = Dinero({
					amount: paymentSubscription.amount,
				});
				const processingFee = Dinero({
					amount: paymentSubscription.processingFee,
				});
				const platformFee = Dinero({
					amount: paymentSubscription.platformFee,
				});
				const totalFee = processingFee.add(platformFee);
				const total = amount.add(processingFee).add(platformFee);
				transactions.push({
					id: paymentSubscription.id,
					creator: {
						id: paymentSubscriptionTransaction.creator.id,
						username:
							paymentSubscriptionTransaction.creator.profileLink
								?.split("/")
								.slice(-1)[0],
						displayName:
							paymentSubscriptionTransaction.creator.displayName,
						avatar: paymentSubscriptionTransaction.creator.avatar,
					},
					description: `Subscription ${
						paymentSubscriptionTransaction.status === "Successful"
							? paymentSubscriptionTransactions
									.filter(
										(transaction) =>
											transaction.paymentSubscriptionId ===
											paymentSubscription.id,
									)
									.sort(
										(a, b) =>
											new Date(a.createdAt).getTime() -
											new Date(b.createdAt).getTime(),
									)[0].id ===
							  paymentSubscriptionTransaction.id
								? "Creation"
								: "Renewed"
							: paymentSubscriptionTransaction.status
					}`,
					status: paymentSubscriptionTransaction.status,
					date: paymentSubscriptionTransaction.createdAt,
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee:
						processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					platformFee:
						platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					totalFee: totalFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					total: total.getAmount() / DECIMAL_TO_CENT_FACTOR,
				});
			}

			for (const paidPostTransaction of paidPostTransactions) {
				const amount = Dinero({ amount: paidPostTransaction.amount });
				const processingFee = Dinero({
					amount: paidPostTransaction.processingFee,
				});
				const platformFee = Dinero({
					amount: paidPostTransaction.platformFee,
				});
				const totalFee = processingFee.add(platformFee);
				const total = amount.add(processingFee).add(platformFee);

				transactions.push({
					id: paidPostTransaction.id,
					creator: {
						id: paidPostTransaction.creator.id,
						username: paidPostTransaction.creator.profileLink
							?.split("/")
							.slice(-1)[0],
						displayName: paidPostTransaction.creator.displayName,
						avatar: paidPostTransaction.creator.avatar,
					},
					description: `Paid Post ${paidPostTransaction.status}`,
					status: paidPostTransaction.status,
					date: paidPostTransaction.createdAt,
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee:
						processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					platformFee:
						platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					totalFee: totalFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					total: total.getAmount() / DECIMAL_TO_CENT_FACTOR,
				});
			}

			for (const cameoPayment of cameoPayments) {
				const amount = Dinero({ amount: cameoPayment.amount });
				const processingFee = Dinero({
					amount: cameoPayment.processingFee,
				});
				const platformFee = Dinero({
					amount: cameoPayment.platformFee,
				});
				const totalFee = processingFee.add(platformFee);
				const total = amount.add(processingFee).add(platformFee);

				transactions.push({
					id: cameoPayment.id,
					creator: {
						id: cameoPayment.creator.id,
						username: cameoPayment.creator.profileLink
							?.split("/")
							.slice(-1)[0],
						displayName: cameoPayment.creator.displayName,
						avatar: cameoPayment.creator.avatar,
					},
					description: `Cameo ${cameoPayment.status}`,
					status: cameoPayment.status,
					date: cameoPayment.createdAt,
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee:
						processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					platformFee:
						platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					totalFee: totalFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					total: total.getAmount() / DECIMAL_TO_CENT_FACTOR,
				});
			}

			const filteredTransactions = transactions.filter((transaction) => {
				return (
					transaction.creator.username?.includes(search) ||
					transaction.creator.displayName?.includes(search) ||
					transaction.description.includes(search)
				);
			});

			filteredTransactions.sort(
				(a, b) => b.date.getTime() - a.date.getTime(),
			);

			const paginatedTransactions = filteredTransactions.slice(
				(page - 1) * limit,
				page * limit,
			);

			reply.status(200).send({
				transactions: paginatedTransactions,
				page,
				pages: Math.ceil(filteredTransactions.length / limit),
				total: filteredTransactions.length,
			});
		},
	);

	fastify.get(
		"/popup-status",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			let popupStatus = await prisma.popupStatus.findFirst({
				where: { userId: user.id },
			});

			if (!popupStatus) {
				popupStatus = await prisma.popupStatus.create({
					data: {
						id: snowflake.gen(),
						userId: user.id,
					},
				});
			}

			let paymentSubscription;

			if (popupStatus.showManageSubscriptionDialog) {
				const currentDate = new Date();
				const startDateDefault = new Date(currentDate);
				startDateDefault.setMonth(startDateDefault.getMonth() + 1);
				startDateDefault.setDate(currentDate.getDate());

				if (currentDate.getDate() !== startDateDefault.getDate()) {
					startDateDefault.setDate(0);
				}

				const daysFromNow = new Date(
					startDateDefault.getTime() + 24 * 60 * 60 * 1000 * 24,
				);

				const daysBeforeRenewal = new Date(
					startDateDefault.setMonth(startDateDefault.getMonth() + 1),
				);

				paymentSubscription =
					await prisma.paymentSubscription.findFirst({
						where: {
							userId: user.id,
							status: SubscriptionStatus.Active,
							startDate: {
								gte: daysFromNow,
								lte: daysBeforeRenewal,
							},
						},
						orderBy: {
							startDate: "asc",
						},
						select: {
							id: true,
							creator: {
								select: {
									displayName: true,
								},
							},
							startDate: true,
							amount: true,
						},
					});
			}

			const showSubscriptionDialog =
				popupStatus.showManageSubscriptionDialog && paymentSubscription;

			if (popupStatus) {
				await prisma.popupStatus.update({
					where: { userId: user.id },
					data: {
						showFairTransactionDialog: false,
						showNoticeChargeBackDialog: false,
						showManageSubscriptionDialog: showSubscriptionDialog
							? false
							: popupStatus.showManageSubscriptionDialog,
					},
				});
			}

			return reply.status(200).send({
				popupStatus: {
					...popupStatus,
					paymentSubscription: paymentSubscription
						? {
								...paymentSubscription,
								amount: paymentSubscription.amount
									? paymentSubscription.amount /
									  DECIMAL_TO_CENT_FACTOR
									: 0,
						  }
						: null,
				},
			});
		},
	);
}
