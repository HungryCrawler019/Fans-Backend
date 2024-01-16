import {
	Campaign,
	CampaignType,
	PromotionType,
	SubscriptionStatus,
	TransactionStatus,
} from "@prisma/client";
import dinero, { Dinero } from "dinero.js";
import { FastifyPluginOptions } from "fastify";
import { setInterval } from "node:timers/promises";
import { FastifyTypebox } from "../../types.js";

import AuthorizeNetService from "../../../common/service/AuthorizeNetService.js";
import BullMQService from "../../../common/service/BullMQService.js";
import FeesCalculator from "../../../common/service/FeesCalculatorService.js";
import NotificationService from "../../../common/service/NotificationService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SiftService from "../../../common/service/SiftService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import APIErrors from "../../errors/index.js";

import InboxManagerService from "../../../common/service/InboxManagerService.js";
import { MessageType, NotificationType } from "../../CommonAPISchemas.js";
import {
	SubscribeFreeReqBody,
	SubscribePaymentMethodReqBody,
	SubscribeReqBody,
	SubscriptionHasAccessReqBody,
	SubscriptionHasAccessRespBody,
	SubscriptionPriceReqQuery,
	SubscriptionPriceRespBody,
	UnsubscribeReqBody,
} from "./schemas.js";
import {
	SubscribeFreeReqBodyValidator,
	SubscribePaymentMethodReqBodyValidator,
	SubscribeReqBodyValidator,
	SubscriptionHasAccessReqBodyValidator,
	SubscriptionPriceReqQueryValidator,
	UnsubscribeReqBodyValidator,
} from "./validation.js";
import { TaxjarError } from "taxjar/dist/util/types.js";

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
	const feesCalculator = await container.resolve(FeesCalculator);
	const bullMQService = await container.resolve(BullMQService);
	const notification = await container.resolve(NotificationService);
	const siftService = await container.resolve(SiftService);
	const inboxManager = await container.resolve(InboxManagerService);

	const formatPriceForNotification = (
		dinero: Dinero,
		currency: string = "USD",
	) => {
		return `${dinero.toFormat("0.00")} ${currency}`;
	};

	interface CalculateFeesInput {
		userId: bigint;
		id: bigint;
		bundleId?: bigint;
		customerInformation?: {
			country: string;
			state: string;
			city: string;
			zip: string;
			address: string;
		};
	}

	interface CalculateFeesOutput {
		amount: number;
		platformFee: number;
		vatFee: number;
		totalAmount: number;
		campaignId?: bigint;
		freeTrial?: boolean;
		freeTrialPeriod?: number;
		discount?: number;
		discountPeriod?: number;
	}

	async function getApplicableCampaigns(
		subscriptionId: bigint,
	): Promise<Campaign[]> {
		return prisma.campaign.findMany({
			where: {
				subscriptionId,
			},
		});
	}

	async function isExistingUser(
		userId: bigint,
		subscriptionId: bigint,
	): Promise<boolean> {
		const [subscription, tier] = await Promise.all([
			prisma.subscription.findUnique({ where: { id: subscriptionId } }),
			prisma.tier.findUnique({ where: { id: subscriptionId } }),
		]);

		if (!subscription && !tier) {
			return false;
		}

		const creatorId = subscription?.profileId || tier?.profileId;

		const transaction =
			await prisma.paymentSubscriptionTransaction.findFirst({
				where: {
					userId,
					creatorId,
					status: TransactionStatus.Successful,
				},
			});
		return !!transaction;
	}

	async function isCampaignLimitExceeded(
		campaignId: bigint,
	): Promise<boolean> {
		const count = await prisma.paymentSubscription.count({
			where: {
				campaignId,
			},
		});
		const campaign = await prisma.campaign.findUnique({
			where: {
				id: campaignId,
			},
		});

		if (!campaign) {
			return true;
		}

		if (campaign.limit === 0) {
			// 0 means unlimited or undefined
			return false;
		}

		return count >= campaign.limit;
	}

	async function getEligibleCampaign(
		data: CalculateFeesInput,
	): Promise<Campaign | null> {
		const campaigns = await getApplicableCampaigns(BigInt(data.id));
		const isExisting = await isExistingUser(data.userId, data.id);

		let eligibleCampaign: Campaign | null = null;

		for (const campaign of campaigns) {
			if (
				(!isExisting && campaign.applicable === CampaignType.NEW) ||
				(isExisting && campaign.applicable === CampaignType.EXISTING) ||
				campaign.applicable === CampaignType.BOTH
			) {
				if (!(await isCampaignLimitExceeded(campaign.id))) {
					eligibleCampaign = campaign;
					break;
				}
			}
		}

		return eligibleCampaign;
	}

	async function calculateFees(
		data: CalculateFeesInput,
	): Promise<CalculateFeesOutput | TaxjarError | undefined> {
		const { userId, id, bundleId } = data;

		const user = await prisma.user.findUnique({
			where: { id: BigInt(userId) },
		});

		if (!user) {
			throw new Error("User not found.");
		}

		const [subscription, tier] = await Promise.all([
			prisma.subscription.findUnique({ where: { id: BigInt(id) } }),
			prisma.tier.findUnique({ where: { id: BigInt(id) } }),
		]);

		let amountDinero: Dinero;

		if (subscription) {
			amountDinero = dinero({
				amount: Math.round(subscription.price * 100),
			});
		} else if (tier) {
			amountDinero = dinero({ amount: Math.round(tier.price * 100) });
		} else {
			return;
		}

		const bundle = bundleId
			? await prisma.bundle.findUnique({
					where: { id: BigInt(bundleId) },
			  })
			: null;

		if (bundle?.month) {
			amountDinero = amountDinero
				.multiply(1 - bundle.discount / 100)
				.multiply(bundle.month);
		}

		const feesOutput = await feesCalculator.purchaseServiceFees(
			amountDinero.getAmount(),
			data.customerInformation,
		);

		if (feesOutput instanceof TaxjarError) {
			return feesOutput;
		}

		const fees: CalculateFeesOutput = {
			amount: feesOutput.amount.getAmount(),
			platformFee: feesOutput.platformFee.getAmount(),
			vatFee: feesOutput.vatFee.getAmount(),
			totalAmount: feesOutput.totalAmount.getAmount(),
		};

		const eligibleCampaign = await getEligibleCampaign(data);
		if (eligibleCampaign) {
			if (eligibleCampaign.type === PromotionType.Free_Trial) {
				return {
					...fees,
					campaignId: eligibleCampaign.id,
					freeTrial: true,
					freeTrialPeriod: eligibleCampaign.duration ?? undefined,
				};
			} else if (eligibleCampaign.type === PromotionType.Discount) {
				return {
					...fees,
					campaignId: eligibleCampaign.id,
					discount: eligibleCampaign.discount,
					discountPeriod: eligibleCampaign.duration ?? undefined,
				};
			}
		}

		return fees;
	}

	fastify.get<{
		Querystring: SubscriptionPriceReqQuery;
		Reply: SubscriptionPriceRespBody;
	}>(
		"/price",
		{
			schema: {
				querystring: SubscriptionPriceReqQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const { id, bundleId, customerPaymentProfileId } = request.query;

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

			const feesOutput = await calculateFees({
				userId: BigInt(user.id),
				id: BigInt(id),
				bundleId: bundleId ? BigInt(bundleId) : undefined,
				customerInformation: customerInformation,
			});

			if (!feesOutput) {
				return reply.sendError(
					APIErrors.SUBSCRIPTION_OR_TIER_NOT_FOUND,
				);
			}

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			reply.send({
				amount: feesOutput.amount / DECIMAL_TO_CENT_FACTOR,
				platformFee: feesOutput.platformFee / DECIMAL_TO_CENT_FACTOR,
				vatFee: feesOutput.vatFee / DECIMAL_TO_CENT_FACTOR,
				totalAmount: feesOutput.totalAmount / DECIMAL_TO_CENT_FACTOR,
				campaignId: feesOutput.campaignId,
				freeTrial: feesOutput.freeTrial,
				freeTrialPeriod: feesOutput.freeTrialPeriod,
				discount: feesOutput.discount,
				discountPeriod: feesOutput.discountPeriod,
			});
		},
	);

	fastify.get<{
		Params: SubscriptionHasAccessReqBody;
		Reply: SubscriptionHasAccessRespBody;
	}>(
		"/has-access/:creatorId",
		{
			schema: {
				params: SubscriptionHasAccessReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const creatorId = request.params.creatorId;
			const session = request.session!;
			const user = await session.getUser(prisma);
			const creator = await session.getProfile(prisma);

			if (creator?.id === BigInt(creatorId)) {
				return reply.send({ hasAccess: true });
			}

			const activeSubscription =
				await prisma.paymentSubscription.findFirst({
					where: {
						creatorId: BigInt(creatorId),
						userId: user.id,
						OR: [
							{
								status: SubscriptionStatus.Active,
							},
							{
								endDate: {
									gte: new Date(),
								},
							},
						],
					},
				});

			if (activeSubscription) {
				return reply.send({ hasAccess: true });
			}

			return reply.send({ hasAccess: false });
		},
	);

	// TODO: Create a Reply schema (SubscriptionListRespBody) for this route
	// do not destructure objects, use ModelConverter class.
	fastify.get(
		"/subscriptions",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const user = await session.getUser(prisma);

				if (!user) {
					return reply.sendError(APIErrors.USER_NOT_FOUND);
				}

				// TODO: use include / select instead of this mess.
				const userSubscriptions =
					await prisma.paymentSubscription.findMany({
						where: {
							userId: user.id,
							status: {
								notIn: [
									SubscriptionStatus.Initialized,
									SubscriptionStatus.Submitted,
									SubscriptionStatus.Pending,
								],
							},
						},
						select: {
							id: true,
							subscriptionId: true,
							tierId: true,
							error: true,
							status: true,
							amount: true,
							processingFee: true,
							platformFee: true,
							startDate: true,
							endDate: true,
							creator: {
								select: {
									id: true,
									userId: true,
									displayName: true,
									migrationLink: true,
									profileLink: true,
									bio: true,
									cover: true,
									isNSFW: true,
									subscriptionType: true,
									flags: true,
									disabled: true,
									location: true,
									birthday: true,
									socialLinks: true,
									subscriptions: {
										select: {
											id: true,
											price: true,
											bundles: {
												select: {
													id: true,
													month: true,
													discount: true,
												},
											},
										},
									},
									tiers: true,
									commentCount: true,
									likeCount: true,
									previews: true,
									avatar: true,
									user: true,
									roles: true,
									categories: true,
								},
							},
							subscription: {
								select: {
									id: true,
									price: true,
									bundles: {
										select: {
											id: true,
											month: true,
											discount: true,
										},
									},
								},
							},
							bundle: {
								select: {
									id: true,
									month: true,
									discount: true,
								},
							},
							tier: {
								select: {
									id: true,
									price: true,
								},
							},
							campaign: {
								select: {
									type: true,
									duration: true,
								},
							},
						},
						orderBy: {
							createdAt: "desc",
						},
					});

				const subscriptions = userSubscriptions.map((subscription) => {
					const updatedBundles =
						subscription.subscription?.bundles.map((bundle) => {
							if (!subscription.subscription) return;

							const monthlyPriceInCents = dinero({
								amount: Math.round(
									subscription.subscription.price *
										DECIMAL_TO_CENT_FACTOR,
								),
							});

							const discountInCents =
								monthlyPriceInCents.percentage(bundle.discount);

							const netAmount = monthlyPriceInCents
								.subtract(discountInCents)
								.getAmount();

							return {
								...bundle,
								price: netAmount / DECIMAL_TO_CENT_FACTOR,
							};
						});

					const totalAmountInCents = dinero({
						amount: subscription.amount,
					});

					const updatedAmount = subscription.bundle?.month
						? totalAmountInCents.divide(subscription.bundle.month)
						: totalAmountInCents;

					return {
						...subscription,
						amount:
							updatedAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
						subscription: {
							...subscription.subscription,
							bundles: updatedBundles,
						},
					};
				});

				reply.send(subscriptions);
			} catch (error) {
				reply.sendError(APIErrors.FETCH_SUBSCRIPTIONS_FAILED);
			}
		},
	);

	fastify.post<{ Body: SubscribeFreeReqBody }>(
		"/subscribe/free",
		{
			schema: {
				body: {
					schema: SubscribeFreeReqBodyValidator,
				},
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = await session.getProfile(prisma);

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

			if (!customerProfile) {
				return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
			}

			const [subscription, tier] = await Promise.all([
				prisma.subscription.findUnique({ where: { id: BigInt(id) } }),
				prisma.tier.findUnique({ where: { id: BigInt(id) } }),
			]);

			if (subscription?.price !== 0 && tier?.price !== 0) {
				return reply.sendError(APIErrors.SUBSCRIPTION_NOT_FREE);
			}

			let creatorId;

			if (subscription) {
				creatorId = subscription.profileId;
			} else if (tier) {
				creatorId = tier.profileId;
			} else {
				return reply.sendError(
					APIErrors.SUBSCRIPTION_OR_TIER_NOT_FOUND,
				);
			}

			if (creatorId === profile?.id) {
				return reply.sendError(APIErrors.SUBSCRIBE_SELF);
			}

			const existingSubscription =
				await prisma.paymentSubscription.findFirst({
					where: {
						userId: user.id,
						creatorId: creatorId,
						OR: [
							{
								status: SubscriptionStatus.Active,
							},
							{
								endDate: {
									gte: new Date(),
								},
							},
						],
					},
				});

			if (existingSubscription) {
				return reply.sendError(APIErrors.ALREADY_SUBSCRIBED);
			}

			await prisma.paymentSubscription.create({
				data: {
					id: snowflake.gen(),
					userId: user.id,
					creatorId: creatorId,
					subscriptionId: subscription?.id,
					tierId: tier?.id,
					provider: "AuthorizeNet",
					startDate: new Date(),
					amount: 0,
					processingFee: 0,
					platformFee: 0,
					status: "Active",
				},
			});

			// await xpService.addXPLog("Subscribe", 0, user.id, creatorId);

			(async () => {
				const creator = await prisma.profile.findUnique({
					where: { id: creatorId },
					select: { userId: true, notificationsSettings: true },
				});

				if (!creator) return;

				if (creator.notificationsSettings?.newSubscriberCreatorInApp) {
					await notification.createNotification(creator.userId, {
						type: NotificationType.SubscriptionSubscribed,
						users: [user.id],
						price: "free",
					});
				}
			})();

			return reply.send();
		},
	);

	fastify.post<{ Body: SubscribeReqBody }>(
		"/subscribe",
		{
			schema: {
				body: {
					schema: SubscribeReqBodyValidator,
				},
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				authorizeNetService.webhookPrehandler,
			],
		},
		async (request, reply) => {
			const { id, bundleId, customerPaymentProfileId, fanReferralCode } =
				request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = await session.getProfile(prisma);

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

			const [subscription, tier] = await Promise.all([
				prisma.subscription.findUnique({ where: { id: BigInt(id) } }),
				prisma.tier.findUnique({ where: { id: BigInt(id) } }),
			]);

			let creatorId;

			if (subscription) {
				creatorId = subscription.profileId;
			} else if (tier) {
				creatorId = tier.profileId;
			} else {
				return reply.sendError(
					APIErrors.SUBSCRIPTION_OR_TIER_NOT_FOUND,
				);
			}

			if (creatorId === profile?.id) {
				return reply.sendError(APIErrors.SUBSCRIBE_SELF);
			}

			const existingSubscription =
				await prisma.paymentSubscription.findFirst({
					where: {
						userId: user.id,
						creatorId: creatorId,
						OR: [
							{
								status: SubscriptionStatus.Active,
							},
							{
								endDate: {
									gte: new Date(),
								},
							},
							{
								AND: [
									{
										status: {
											in: [
												SubscriptionStatus.Initialized,
												SubscriptionStatus.Submitted,
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
					orderBy: {
						createdAt: "desc",
					},
				});

			if (existingSubscription) {
				if (
					existingSubscription.status !== SubscriptionStatus.Active &&
					existingSubscription.endDate &&
					existingSubscription.endDate > new Date()
				) {
					return reply.sendError(APIErrors.ALREADY_SUBSCRIBED);
				} else {
					return reply.sendError(
						APIErrors.SUBSCRIPTION_IS_PROCESSING,
					);
				}
			}

			const bundle = bundleId
				? await prisma.bundle.findUnique({
						where: { id: BigInt(bundleId) },
				  })
				: null;

			const feesOutput = await calculateFees({
				userId: BigInt(user.id),
				id: BigInt(id),
				bundleId: bundleId ? BigInt(bundleId) : undefined,
				customerInformation,
			});

			if (!feesOutput) {
				return reply.sendError(
					APIErrors.SUBSCRIPTION_OR_TIER_NOT_FOUND,
				);
			}

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			const {
				amount,
				platformFee,
				totalAmount,
				campaignId,
				freeTrial,
				freeTrialPeriod,
				discount,
				discountPeriod,
			} = feesOutput;

			let intervalLength = 1;
			if (bundle && bundle.month) {
				intervalLength = bundle.month;
			}

			const amountDinero = dinero({ amount: amount });

			let trialAmountDinero;
			if (freeTrial) {
				trialAmountDinero = dinero({ amount: 0 });
			} else if (discount) {
				trialAmountDinero = amountDinero.multiply(discount).divide(100);
			} else {
				trialAmountDinero = dinero({ amount: 0 });
			}

			const currentDate = new Date();
			const nextMonth = new Date(currentDate);
			nextMonth.setMonth(nextMonth.getMonth() + 1);
			nextMonth.setDate(currentDate.getDate());

			if (currentDate.getDate() !== nextMonth.getDate()) {
				nextMonth.setDate(0);
			}

			const startDate = freeTrial ? currentDate : nextMonth;

			const subscriptionDetails = {
				description: `Subscription for ${user.username}`,
				amount: totalAmount / DECIMAL_TO_CENT_FACTOR,
				trialAmount:
					trialAmountDinero.getAmount() / DECIMAL_TO_CENT_FACTOR,
				customerProfileId: paymentMethod.token,
				customerPaymentProfileId:
					customerPaymentProfile.customerPaymentProfileId,
				schedule: {
					startDate: startDate,
					totalOccurrences: 999,
					intervalLength: intervalLength,
					totalTrialOccurrences:
						freeTrialPeriod || discountPeriod || 0,
				},
			};

			const fanReferral = fanReferralCode
				? await prisma.fanReferral.findFirst({
						where: { code: fanReferralCode },
						include: { profile: true },
				  })
				: undefined;

			const paymentSubscription = await prisma.paymentSubscription.create(
				{
					data: {
						id: snowflake.gen(),
						userId: user.id,
						creatorId: creatorId,
						paymentMethodId: paymentMethod.id,
						paymentProfileId:
							customerPaymentProfile.customerPaymentProfileId,
						subscriptionId: subscription?.id,
						tierId: tier?.id,
						bundleId: bundle?.id,
						campaignId,
						provider: "AuthorizeNet",
						interval: intervalLength,
						startDate: startDate,
						amount,
						processingFee: 0,
						platformFee,
						status: "Initialized",
						fanReferralCode:
							fanReferral &&
							fanReferral.profile.isFanReferralEnabled
								? fanReferralCode
								: undefined,
					},
				},
			);

			const response = await siftService.createOrder({
				$user_id: user.id.toString(),
				$order_id: paymentSubscription.id.toString(),
				$user_email: user.email,
				$amount: totalAmount * 10000, //micros
				$currency_code: "USD",
				$ip: request.ip,
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
				$payment_methods: [
					{
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
				],
				$browser: {
					$user_agent: request.headers["user-agent"] ?? "",
					$accept_language: request.headers["accept-language"] ?? "",
				},
			});

			const hasBadPaymentAbuseDecision =
				response.score_response.workflow_statuses.some((workflow) =>
					workflow.history.some(
						(historyItem) =>
							historyItem.config.decision_id ===
							"looks_bad_payment_abuse",
					),
				);

			if (hasBadPaymentAbuseDecision) {
				await prisma.paymentSubscription.update({
					where: { id: paymentSubscription.id },
					data: {
						status: "Failed",
						error: "Transaction flagged as fraudulent.",
						endDate: new Date(),
					},
				});

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						"Transaction flagged as fraudulent.",
					),
				);
			}

			let firstPaymentResponse;

			if (!freeTrial) {
				firstPaymentResponse =
					await authorizeNetService.createAcceptPaymentSubscriptionTransaction(
						{
							customerProfileId: paymentMethod.token,
							customerPaymentProfileId:
								customerPaymentProfile.customerPaymentProfileId,
							description: `Subscription for ${user.username} - 1st Payment`,
							amount: totalAmount / DECIMAL_TO_CENT_FACTOR,
							merchantData: {
								userId: user.id.toString(),
								transactionId:
									paymentSubscription.id.toString(),
							},
						},
					);

				if (
					firstPaymentResponse.getMessages().getResultCode() !== "Ok"
				) {
					await prisma.paymentSubscription.update({
						where: { id: paymentSubscription.id },
						data: {
							status: "Failed",
							error: firstPaymentResponse
								.getMessages()
								.getMessage()[0]
								.getText(),
							endDate: new Date(),
						},
					});

					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							firstPaymentResponse
								.getMessages()
								.getMessage()[0]
								.getText(),
						),
					);
				}

				if (firstPaymentResponse.getTransactionResponse().getErrors()) {
					await prisma.paymentSubscription.update({
						where: { id: paymentSubscription.id },
						data: {
							status: "Failed",
							error: firstPaymentResponse
								.getTransactionResponse()
								.getErrors()
								?.getError()[0]
								.getErrorText(),
							endDate: new Date(),
						},
					});

					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							firstPaymentResponse
								.getTransactionResponse()
								.getErrors()
								?.getError()[0]
								.getErrorText(),
						),
					);
				}
			}

			const authNetResponse =
				await authorizeNetService.createSubscription({
					...subscriptionDetails,
					merchantData: {
						userId: user.id.toString(),
						transactionId: paymentSubscription.id.toString(),
					},
				});

			if (authNetResponse.getMessages().getResultCode() !== "Ok") {
				await prisma.paymentSubscription.update({
					where: { id: paymentSubscription.id },
					data: {
						status: "Failed",
						error: authNetResponse
							.getMessages()
							.getMessage()[0]
							.getText(),
						endDate: new Date(),
					},
				});

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						authNetResponse.getMessages().getMessage()[0].getText(),
					),
				);
			}

			await prisma.paymentSubscription.update({
				where: { id: paymentSubscription.id },
				data: {
					status: freeTrial
						? SubscriptionStatus.Active
						: SubscriptionStatus.Submitted,
					transactionId: authNetResponse.getSubscriptionId(),
					firstPaymentTransactionId: firstPaymentResponse
						?.getTransactionResponse()
						?.getTransId(),
				},
			});

			const POLL_INTERVAL = 1000;
			const MAX_DURATION = 45000;

			for await (const startTime of setInterval(
				POLL_INTERVAL,
				Date.now(),
			)) {
				const paymentSubscriptionStatus =
					await prisma.paymentSubscription.findUnique({
						where: { id: paymentSubscription.id },
						select: { status: true },
					});

				if (
					paymentSubscriptionStatus?.status ===
					SubscriptionStatus.Active
				) {
					// TODO: move this outside for cleaniness
					(async () => {
						const creator = await prisma.profile.findUnique({
							where: { id: creatorId },
							select: {
								userId: true,
								notificationsSettings: true,
							},
						});

						if (!creator) return;

						const isRenewed =
							await prisma.paymentSubscription.findFirst({
								where: {
									userId: user.id,
									creatorId: creatorId,
									status: SubscriptionStatus.Cancelled,
									id: {
										not: paymentSubscription.id,
									},
								},
							});

						if (
							creator.notificationsSettings
								?.newSubscriberCreatorInApp
						) {
							await notification.createNotification(
								creator.userId,
								{
									type: isRenewed
										? NotificationType.SubscriptionRenewedCreator
										: NotificationType.SubscriptionSubscribed,
									users: [user.id],
									price: formatPriceForNotification(
										amountDinero,
									),
								},
							);
						}

						if (
							isRenewed &&
							creator.notificationsSettings?.transactionFanInApp
						) {
							await notification.createNotification(user.id, {
								type: NotificationType.SubscriptionRenewedFan,
								users: [creator.userId],
								price: formatPriceForNotification(amountDinero),
							});
						}
					})();

					return reply.send();
				}

				if (
					paymentSubscriptionStatus?.status !==
					SubscriptionStatus.Submitted
				) {
					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							"Payment failed. Try again with a different payment method.",
						),
					);
				}

				if (Date.now() - startTime > MAX_DURATION) {
					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							"Card declined, try with another payment method.",
						),
					);
				}
			}
		},
	);

	fastify.get<{
		Params: { id: string };
		// Body: GetPaymentMethodInfoRespBody;
	}>(
		"/payment-method/:id",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const subscriptionId = request.params.id;

			const subscription = await prisma.paymentSubscription.findUnique({
				where: { id: BigInt(subscriptionId) },
			});

			if (!subscription || !subscription?.transactionId) {
				return reply.sendError(
					APIErrors.PAYMENT_SUBSCRIPTION_NOT_FOUND,
				);
			}

			const transactionId = subscription.transactionId;

			try {
				const subscriptionResponse =
					await authorizeNetService.fetchSubscription(transactionId);

				const paymentProfileResponse =
					await authorizeNetService.fetchCustomerPaymentProfile(
						subscriptionResponse.subscription.profile
							.customerProfileId,
						subscriptionResponse.subscription.profile.paymentProfile
							.customerPaymentProfileId,
					);

				// TODO: define explicit schema
				// const paymentMethod: GetPaymentMethodInfoRespBody = {
				const paymentMethod = {
					customerPaymentProfileId:
						paymentProfileResponse.paymentProfile
							.customerPaymentProfileId,
					cardNumber:
						paymentProfileResponse.paymentProfile.payment.creditCard
							.cardNumber,
					expirationDate:
						paymentProfileResponse.paymentProfile.payment.creditCard
							.expirationDate,
					cardType:
						paymentProfileResponse.paymentProfile.payment.creditCard
							.cardType,
				};

				reply.send(paymentMethod);
			} catch (error) {
				reply.sendError(
					APIErrors.PAYMENT_METHOD_FETCH_FAILED(
						"Failed to fetch payment method.",
					),
				);
			}
		},
	);

	fastify.put<{ Body: SubscribePaymentMethodReqBody }>(
		"/payment-method",
		{
			schema: {
				body: SubscribePaymentMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { id, customerPaymentProfileId } = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);

			const subscription = await prisma.paymentSubscription.findFirst({
				where: {
					id: BigInt(id),
					userId: user.id,
				},
			});

			if (
				!subscription ||
				!subscription?.transactionId ||
				!subscription?.paymentMethodId
			) {
				return reply.sendError(
					APIErrors.PAYMENT_SUBSCRIPTION_NOT_FOUND,
				);
			}

			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					id: subscription.paymentMethodId,
					userId: user.id,
				},
			});

			if (!paymentMethod) {
				return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
			}

			try {
				const response =
					await authorizeNetService.updateSubscriptionPaymentProfile(
						subscription.transactionId,
						paymentMethod?.token,
						customerPaymentProfileId,
					);

				if (response.getMessages().getResultCode() !== "Ok") {
					return reply.sendError(
						APIErrors.UPDATE_SUBSCRIPTION_PAYMENT_METHOD_FAILED(
							response.getMessages().getMessage()[0].getText(),
						),
					);
				}

				(async () => {
					const customerProfile =
						await authorizeNetService.fetchCustomerProfile(
							paymentMethod?.token,
						);

					if (
						customerProfile.getMessages().getResultCode() !== "Ok"
					) {
						return;
					}

					const customerPaymentProfile =
						customerProfile.profile.paymentProfiles.find(
							(profile: any) =>
								profile.customerPaymentProfileId ===
								customerPaymentProfileId,
						);

					if (!customerPaymentProfile) {
						return;
					}

					await siftService.updateOrder({
						$user_id: user.id.toString(),
						$order_id: subscription.id.toString(),
						$user_email: user.email,
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
						$payment_methods: [
							{
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
						],
					});
				})();
			} catch (error) {
				return reply.sendError(
					APIErrors.UPDATE_SUBSCRIPTION_PAYMENT_METHOD_FAILED(
						"Failed to update subscription payment method.",
					),
				);
			}

			reply.send();
		},
	);

	fastify.post<{ Body: UnsubscribeReqBody }>(
		"/unsubscribe",
		{
			schema: {
				body: {
					schema: UnsubscribeReqBodyValidator,
				},
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				authorizeNetService.webhookPrehandler,
			],
		},
		async (request, reply) => {
			const { id } = request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);

			const paymentSubscription =
				await prisma.paymentSubscription.findFirst({
					where: {
						id: BigInt(id),
						userId: user.id,
					},
				});

			if (!paymentSubscription) {
				return reply.sendError(
					APIErrors.PAYMENT_SUBSCRIPTION_NOT_FOUND,
				);
			}

			if (paymentSubscription.amount === 0) {
				await prisma.paymentSubscription.update({
					where: { id: paymentSubscription.id },
					data: {
						status: SubscriptionStatus.Cancelled,
						endDate: new Date(),
					},
				});

				reply.send({ message: "Subscription successfully cancelled." });
				return;
			}

			if (!paymentSubscription.transactionId) {
				return reply.sendError(
					APIErrors.PAYMENT_SUBSCRIPTION_NOT_FOUND,
				);
			}

			if (paymentSubscription.status === SubscriptionStatus.Cancelled) {
				return reply.sendError(
					APIErrors.SUBSCRIPTION_ALREADY_CANCELLED,
				);
			}

			if (paymentSubscription.status !== SubscriptionStatus.Active) {
				return reply.sendError(APIErrors.SUBSCRIPTION_NOT_ACTIVE);
			}

			const response = await authorizeNetService.cancelSubscription(
				paymentSubscription.transactionId,
			);

			if (response.getMessages().getResultCode() !== "Ok") {
				return reply.sendError(APIErrors.SUBSCRIPTION_CANCEL_FAILED);
			}

			const cancellationDate = new Date();
			cancellationDate.setMonth(cancellationDate.getMonth() + 1);
			cancellationDate.setDate(paymentSubscription.startDate.getDate());

			if (
				paymentSubscription.startDate.getDate() !==
				cancellationDate.getDate()
			) {
				cancellationDate.setDate(0);
			}

			await prisma.paymentSubscription.update({
				where: { id: paymentSubscription.id },
				data: {
					status: SubscriptionStatus.Cancelled,
					endDate: cancellationDate,
				},
			});

			return reply.send();
		},
	);

	interface AuthorizeNetWebhookEvent {
		eventType: string;
		notificationId: string;
		payload: { id: string };
	}

	fastify.post(
		"/webhook/authorize-net",
		{
			config: {
				rawBody: true,
			},
			// This endpoint cannot return an erroneous status code, otherwise Authorize.net will nuke the webhook 🙃
			errorHandler: (error, request, reply) => {
				if (fastify.sentryErrorHandler) {
					fastify.sentryErrorHandler(error, request, reply);
				}

				return reply.send({ success: false });
			},
		},
		async (request, reply) => {
			if (!request.body) {
				return reply.send({ success: false }); // ignore
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
				return reply.send({ success: false }); // ignore
			}

			const event = request.body as AuthorizeNetWebhookEvent;

			const processedEvent =
				await prisma.processedWebhookEvent.findUnique({
					where: { id: event.notificationId },
				});

			if (processedEvent) {
				return reply.send({ success: false }); // ignore
			}

			const eventType = event.eventType;
			let status: SubscriptionStatus | undefined;
			switch (eventType) {
				case "net.authorize.customer.subscription.expired":
				case "net.authorize.customer.subscription.terminated":
					status = SubscriptionStatus.Terminated;
					break;
				case "net.authorize.customer.subscription.cancelled":
				case "net.authorize.customer.subscription.suspended":
					status = SubscriptionStatus.Cancelled;
					break;
				case "net.authorize.customer.subscription.created":
				case "net.authorize.customer.subscription.updated":
					status = SubscriptionStatus.Active;
					break;
				case "net.authorize.customer.subscription.failed":
					status = SubscriptionStatus.Failed;
					break;
			}

			const transactionId = event.payload.id;

			if (!transactionId) {
				return reply.send({ success: false }); // ignore
			}

			const paymentSubscription =
				await prisma.paymentSubscription.findFirst({
					where: { transactionId: transactionId },
				});

			if (!paymentSubscription) {
				return reply.send({ success: false }); // ignore
			}

			const cancellationDate = new Date();
			cancellationDate.setMonth(cancellationDate.getMonth() + 1);
			cancellationDate.setDate(paymentSubscription.startDate.getDate());

			if (
				paymentSubscription.startDate.getDate() !==
				cancellationDate.getDate()
			) {
				cancellationDate.setDate(0);
			}

			const endDate =
				status === SubscriptionStatus.Cancelled
					? cancellationDate
					: status !== SubscriptionStatus.Active
					? new Date()
					: undefined;

			await prisma.paymentSubscription.update({
				where: { transactionId: transactionId },
				data: {
					status: status,
					endDate: endDate,
				},
			});

			await prisma.processedWebhookEvent.create({
				data: { id: event.notificationId },
			});

			// TODO: refactor this
			// this shouldn't be a part of the webhook handler
			// this should fire events into an event bus or message queue and be handled outside of the request
			(async () => {
				const creator = await prisma.profile.findUnique({
					where: { id: paymentSubscription.creatorId },
					select: {
						id: true,
						userId: true,
						notificationsSettings: true,
					},
				});

				const fan = await prisma.user.findUnique({
					select: { id: true },
					where: { id: paymentSubscription.userId },
				});

				if (!creator) return;
				if (!fan) return;

				if (status === SubscriptionStatus.Cancelled) {
					if (
						creator.notificationsSettings
							?.cancelSubscriptionCreatorInApp
					) {
						await notification.createNotification(creator.userId, {
							type: NotificationType.SubscriptionCancelled,
							users: [paymentSubscription.userId],
						});
					}

					if (endDate) {
						const queue = bullMQService.createQueue(
							"scheduledNotification",
						);
						const delay =
							Number(new Date(endDate)) - Number(new Date());
						await queue.add(
							"scheduledNotification",
							{
								userId: fan.id,
								options: {
									type: NotificationType.SubscriptionExpired,
									users: [creator.userId],
								},
							},
							{ delay },
						);
					}
				} else if (status === SubscriptionStatus.Terminated) {
					await notification.createNotification(
						paymentSubscription.userId,
						{
							type: NotificationType.FanSubscriptionExpired,
							creator: creator.id,
						},
					);
					await notification.createNotification(creator.userId, {
						type: NotificationType.SubscriptionExpired,
						users: [paymentSubscription.userId],
					});
				} else if (status === SubscriptionStatus.Active) {
					const welcomeMessage =
						await prisma.welcomeMessage.findFirst({
							where: {
								profileId: creator.id,
							},
						});

					if (welcomeMessage?.enabled) {
						const { text, image } = welcomeMessage;

						const channel =
							await inboxManager.getOrCreateConversation(
								creator.userId,
								fan.id,
							);

						if (text) {
							inboxManager.createMessage({
								messageType: MessageType.TEXT,
								channelId: channel.inbox.channelId,
								userId: creator.userId,
								content: text,
							});
						}

						// TODO: Add image support
						// 1. use image uploads of usage type chat (mostly needs implementation on frontend)
						// 2. save the upload ids in WelcomeMessage model
						// 3. send the image message here

						// if (image) {
						// 	inboxManager.createMessage({
						// 		messageType: MessageType.IMAGE,
						// 		channelId: channel.inbox.channelId,
						// 		userId: creator.userId,
						// 		uploadIds: ...
						// 	});
						// }
					}
				}
			})();

			return reply.send({ success: true });
		},
	);
}
