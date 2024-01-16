import {
	CreatorReferralTransactionType,
	Profile,
	SubscriptionStatus,
	TransactionStatus,
} from "@prisma/client";
import { formatDistance } from "date-fns";
import { FastifyPluginOptions } from "fastify";
import AuthorizeNetService from "../../../../common/service/AuthorizeNetService.js";
import FeesCalculator from "../../../../common/service/FeesCalculatorService.js";
import GemExchangeService from "../../../../common/service/GemExchangeService.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import APIErrors from "../../../errors/index.js";
import { FastifyTypebox } from "../../../types.js";
import {
	EarningsReqBody,
	PaidPostEarningsReqBody,
	PaidPostPurchased,
	RefundReqBody,
} from "./schemas.js";
import {
	EarningsReqBodyValidator,
	PaidPostEarningsReqBodyValidator,
	PaidPostPurchasedValidator,
	RefundReqBodyValidator,
} from "./validation.js";

const DECIMAL_TO_CENT_FACTOR = 100;

export default async function routes(
	fastify: FastifyTypebox,
	options: FastifyPluginOptions,
) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const feesCalculator = await container.resolve(FeesCalculator);
	const gemExchangeService = await container.resolve(GemExchangeService);
	const authorizeNetService = await container.resolve(AuthorizeNetService);

	const getDates = (start: any, end: any) => {
		const intervals = [
			{ maxDiff: 27 * 24 * 60 * 60 * 1000, interval: "day" },
			{ maxDiff: 32 * 24 * 60 * 60 * 1000, interval: "week" },
			{ maxDiff: 365 * 24 * 60 * 60 * 1000, interval: "month" },
			{ maxDiff: Infinity, interval: "year" },
		];

		if (start.getTime() === end.getTime()) {
			const dates = [];
			const startRange = new Date(
				start.getFullYear(),
				start.getMonth(),
				start.getDate(),
				0,
				0,
				0,
			);
			const endRange = new Date(
				end.getFullYear(),
				end.getMonth(),
				end.getDate(),
				23,
				59,
				59,
				999,
			);

			let currentDate = new Date(startRange);
			while (currentDate <= endRange) {
				dates.push({
					date: new Date(currentDate),
					startRange: new Date(currentDate),
					endRange: new Date(
						currentDate.getTime() + 4 * 60 * 60 * 1000 - 1,
					),
				});
				currentDate = new Date(
					currentDate.getTime() + 4 * 60 * 60 * 1000,
				);
			}

			return dates;
		}

		const diff = end.getTime() - start.getTime();

		const interval =
			intervals.find((i) => diff <= i.maxDiff)?.interval || "year";

		const dates = [];
		let currentDate = new Date(start);

		switch (interval) {
			case "day":
				while (currentDate < end) {
					dates.push({
						date: new Date(currentDate),
						startRange: new Date(currentDate),
						endRange: new Date(
							currentDate.getTime() + 24 * 60 * 60 * 1000 - 1,
						),
					});
					currentDate = new Date(
						currentDate.getTime() + 24 * 60 * 60 * 1000,
					);
				}
				break;
			case "week":
				while (currentDate < end) {
					const startOfWeek = new Date(currentDate);
					startOfWeek.setHours(0, 0, 0, 0);
					const endOfWeek = new Date(
						startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1,
					);
					dates.push({
						date: startOfWeek,
						startRange: startOfWeek,
						endRange: endOfWeek,
					});
					currentDate = new Date(
						currentDate.getTime() + 7 * 24 * 60 * 60 * 1000,
					);
				}
				break;
			case "month":
				while (currentDate < end) {
					const startOfMonth = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth(),
						1,
					);
					const endOfMonth = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth() + 1,
						0,
					);
					dates.push({
						date: startOfMonth,
						startRange: startOfMonth,
						endRange: endOfMonth,
					});
					currentDate = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth() + 1,
						1,
					);
				}
				break;
			case "year":
				while (currentDate < end) {
					const startOfYear = new Date(
						currentDate.getFullYear(),
						0,
						1,
					);
					const endOfYear = new Date(
						currentDate.getFullYear(),
						11,
						31,
						23,
						59,
						59,
						999,
					);
					dates.push({
						date: startOfYear,
						startRange: startOfYear,
						endRange: endOfYear,
					});
					currentDate = new Date(currentDate.getFullYear() + 1, 0, 1);
				}
				break;
		}

		return dates;
	};

	const fetchTransactions = async (
		creatorId: Profile["id"],
		start: Date,
		end: Date,
		options = {
			includeGemsSpendingLogs: true,
			includeSubscriptionTransactions: true,
			includePaidPostTransactions: true,
			includeCameoPayments: true,
		},
	) => {
		interface Filter {
			creatorId: bigint;
			createdAt?: {
				gte: Date;
				lt: Date;
			};
			status: TransactionStatus;
		}

		const filter: Filter = {
			creatorId: BigInt(creatorId),
			status: TransactionStatus.Successful,
		};

		if (start && end) {
			filter.createdAt = {
				gte: new Date(start.setHours(0, 0, 0, 0)),
				lt: new Date(end.setHours(23, 59, 59, 999)),
			};
		}

		const allTransactions = [];

		if (options.includeGemsSpendingLogs) {
			const gemsSpendingLogs = await prisma.gemsSpendingLog.findMany({
				where: filter,
				select: { amount: true, createdAt: true },
				orderBy: { createdAt: "asc" },
			});
			allTransactions.push(...gemsSpendingLogs);
		}

		if (options.includeSubscriptionTransactions) {
			const subscriptionTransactions =
				await prisma.paymentSubscriptionTransaction.findMany({
					where: filter,
					select: { amount: true, createdAt: true },
					orderBy: { createdAt: "asc" },
				});
			allTransactions.push(...subscriptionTransactions);
		}

		if (options.includePaidPostTransactions) {
			const paidPostTransactions =
				await prisma.paidPostTransaction.findMany({
					where: filter,
					select: { amount: true, createdAt: true },
					orderBy: { createdAt: "asc" },
				});
			allTransactions.push(...paidPostTransactions);
		}

		if (options.includeCameoPayments) {
			const cameoPayments = await prisma.cameoPayment.findMany({
				where: filter,
				select: { amount: true, createdAt: true },
				orderBy: { createdAt: "asc" },
			});
			allTransactions.push(...cameoPayments);
		}

		allTransactions.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		);

		return allTransactions;
	};

	function calculatePercentageDifference(
		current: number,
		previous: number,
	): number {
		if (previous === 0) {
			return current > 0 ? 100 : 0;
		} else {
			return ((current - previous) / previous) * 100;
		}
	}

	const processCreatorReferralRefund = async (
		transactionId: string,
		type: CreatorReferralTransactionType,
	) => {
		const creatorReferralTransaction =
			await prisma.creatorReferralTransaction.findFirst({
				where: { transactionId: BigInt(transactionId), type },
			});
		if (creatorReferralTransaction) {
			const balance = await prisma.balance.findFirst({
				where: {
					profileId: creatorReferralTransaction.referrerId,
				},
			});
			if (balance) {
				await prisma.balance.update({
					where: { id: balance.id },
					data: {
						amount: {
							decrement: creatorReferralTransaction.amount,
						},
					},
				});
			}
			await prisma.creatorReferralTransaction.delete({
				where: { id: creatorReferralTransaction.id },
			});
		}
	};

	fastify.post<{
		Body: EarningsReqBody;
	}>(
		"/earnings",
		{
			schema: {
				body: EarningsReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { startDate, endDate } = request.body;
			const session = request.session!;
			const profile = await session.getProfile(prisma);

			if (!profile) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			let start: Date;
			let end: Date;

			if (startDate) {
				start = new Date(startDate);
			} else {
				start = SnowflakeService.extractDate(profile.id);
			}

			if (!endDate) {
				end = new Date();
			} else {
				end = new Date(endDate);
			}

			start = new Date(start.setHours(0, 0, 0, 0));
			end = new Date(end.setHours(23, 59, 59, 999));

			const previousStart = new Date(start);
			const previousEnd = new Date(end);

			previousStart.setTime(
				previousStart.getTime() -
					(previousEnd.getTime() - previousStart.getTime()),
			);

			const dates = getDates(new Date(start), new Date(end));

			const transactions = await fetchTransactions(
				profile.id,
				previousStart,
				previousEnd,
			);

			const earningsByDate = new Map<string, number>();

			for (const date of dates) {
				let earnings = 0;
				const transactionsInDateRange = transactions
					.filter((transaction) => transaction.createdAt >= start)
					.filter(
						(transaction) =>
							transaction.createdAt >= date.startRange &&
							transaction.createdAt <= date.endRange,
					);

				for (const transaction of transactionsInDateRange) {
					earnings += transaction.amount / DECIMAL_TO_CENT_FACTOR;
				}

				earningsByDate.set(date.date.toISOString(), earnings);
			}

			const earningsResults = Array.from(
				earningsByDate,
				([date, earnings]) => ({ date, earnings }),
			);

			earningsResults.sort(
				(a, b) =>
					new Date(a.date).getTime() - new Date(b.date).getTime(),
			);

			const totalEarnings = earningsResults.reduce(
				(sum, record) => sum + record.earnings,
				0,
			);

			const previousPeriodEarnings = transactions.filter(
				(transaction) => transaction.createdAt < start,
			);

			const previousPeriodEarningsTotal = previousPeriodEarnings.reduce(
				(sum, record) => sum + record.amount / DECIMAL_TO_CENT_FACTOR,
				0,
			);

			const percentageDifference = calculatePercentageDifference(
				totalEarnings,
				previousPeriodEarningsTotal,
			);

			const daysDifference = Math.abs(
				(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
			);

			let period = "day";
			if (daysDifference > 7) period = "week";
			if (daysDifference > 31) period = "month";
			if (daysDifference > 365) period = "year";

			let periodLength = 1;
			switch (period) {
				case "day":
					periodLength = daysDifference;
					break;
				case "week":
					periodLength = daysDifference / 7;
					break;
				case "month":
					periodLength = daysDifference / 31;
					break;
				case "year":
					periodLength = daysDifference / 365;
					break;
			}

			periodLength = Number(periodLength.toFixed(0));

			const prevPeriodLabel = `Past${
				periodLength > 1 ? ` ${periodLength}` : ""
			} ${period}${periodLength > 1 ? "s" : ""}`;

			return reply.send({
				prevPeriodLabel: prevPeriodLabel,
				prevPeriodEarnings: previousPeriodEarningsTotal,
				prevPeriodEarningsDifference:
					totalEarnings - previousPeriodEarningsTotal,
				prevPeriodEarningsPercentageDifference: Number(
					percentageDifference.toFixed(2),
				),
				earnings: totalEarnings,
				period: period,
				timeline: earningsResults,
			});
		},
	);

	fastify.get(
		"/subscribers",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = await session.getProfile(prisma);

			if (!profile) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			const subscribers = await prisma.paymentSubscription.findMany({
				where: {
					creatorId: profile.id,
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
				select: {
					user: {
						select: {
							username: true,
							avatar: true,
						},
					},
					userId: true,
					startDate: true,
					amount: true,
					status: true,
					campaign: {
						select: {
							type: true,
						},
					},
				},
				orderBy: { startDate: "asc" },
			});

			const subscriptionPayments =
				await prisma.paymentSubscriptionTransaction.findMany({
					where: {
						creatorId: profile.id,
						status: TransactionStatus.Successful,
					},
					select: {
						userId: true,
						amount: true,
						createdAt: true,
					},
					orderBy: { createdAt: "asc" },
				});

			const tips = await prisma.gemsSpendingLog.findMany({
				where: {
					creatorId: profile.id,
					status: TransactionStatus.Successful,
				},
				select: {
					spenderId: true,
					amount: true,
					createdAt: true,
				},
				orderBy: { createdAt: "asc" },
			});

			const paidPosts = await prisma.paidPostTransaction.findMany({
				where: {
					creatorId: profile.id,
					status: TransactionStatus.Successful,
				},
				select: {
					userId: true,
					amount: true,
					createdAt: true,
				},
				orderBy: { createdAt: "asc" },
			});

			const cameoPayments = await prisma.cameoPayment.findMany({
				where: {
					creatorId: profile.id,
					status: TransactionStatus.Successful,
				},
				select: {
					userId: true,
					amount: true,
					createdAt: true,
				},
				orderBy: { createdAt: "asc" },
			});

			const xpLevels = await prisma.userLevel.findMany({
				where: {
					userId: {
						in: subscribers.map((subscriber) => subscriber.userId),
					},
					creatorId: profile.id,
				},
				select: {
					userId: true,
					level: true,
					role: {
						select: {
							icon: true,
							color: true,
						},
					},
				},
				orderBy: { level: "asc" },
			});

			const subscribersData = subscribers.map((subscriber) => {
				const xpLevel = xpLevels.find(
					(xpLevel) => xpLevel.userId === subscriber.userId,
				);

				let earnings;

				const subscriptionPaymentsForSubscriber =
					subscriptionPayments.filter(
						(payment) => payment.userId === subscriber.userId,
					);

				const tipsForSubscriber = tips.filter(
					(tip) => tip.spenderId === subscriber.userId,
				);

				const paidPostsForSubscriber = paidPosts.filter(
					(paidPost) => paidPost.userId === subscriber.userId,
				);

				const cameoPaymentsForSubscriber = cameoPayments.filter(
					(cameoPayment) => cameoPayment.userId === subscriber.userId,
				);

				earnings = subscriptionPaymentsForSubscriber.reduce(
					(sum, payment) =>
						sum + payment.amount / DECIMAL_TO_CENT_FACTOR,
					0,
				);

				earnings += tipsForSubscriber.reduce(
					(sum, tip) => sum + tip.amount / DECIMAL_TO_CENT_FACTOR,
					0,
				);

				earnings += paidPostsForSubscriber.reduce(
					(sum, paidPost) =>
						sum + paidPost.amount / DECIMAL_TO_CENT_FACTOR,
					0,
				);

				earnings += cameoPaymentsForSubscriber.reduce(
					(sum, cameoPayment) =>
						sum + cameoPayment.amount / DECIMAL_TO_CENT_FACTOR,
					0,
				);

				type XPLevel = {
					role?: {
						icon: string;
						color: string;
					};
					level?: number;
				};

				const defaultIcon = "";
				const defaultColor = "";
				const defaultLevel = 0;

				const { role = {} as XPLevel["role"], level = defaultLevel } =
					(xpLevel as XPLevel) || {};

				const icon = role?.icon || defaultIcon;
				const color = role?.color || defaultColor;

				let startDate = subscriber.startDate.getTime();

				if (subscriber.campaign?.type !== "Free_Trial") {
					const nextMonth = new Date(subscriber.startDate);

					nextMonth.setMonth(subscriber.startDate.getMonth() - 1);

					if (
						nextMonth.getDate() !== subscriber.startDate.getDate()
					) {
						nextMonth.setDate(0);
					}

					startDate = nextMonth.getTime();
				}

				const now = new Date().getTime();
				const period = now - startDate;

				return {
					userId: subscriber.userId,
					username: subscriber.user.username,
					avatar: subscriber.user.avatar,
					icon,
					color,
					level,
					period,
					periodLabel: formatDistance(
						new Date(startDate),
						new Date(),
						{
							addSuffix: false,
						},
					).replace("about ", ""),
					earnings,
					rebillOn: subscriber.status === SubscriptionStatus.Active,
				};
			});

			return reply.send({ subscribers: subscribersData });
		},
	);

	fastify.get(
		"/transactions",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = await session.getProfile(prisma);

			if (!profile) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			const tips = await prisma.gemsSpendingLog.findMany({
				where: {
					creatorId: profile.id,
				},
				select: {
					id: true,
					spenderId: true,
					spender: {
						select: {
							displayName: true,
							username: true,
							avatar: true,
						},
					},
					amount: true,
					status: true,
					createdAt: true,
				},
				orderBy: { createdAt: "asc" },
			});

			const paidPosts = await prisma.paidPostTransaction.findMany({
				where: {
					creatorId: profile.id,
				},
				select: {
					id: true,
					userId: true,
					user: {
						select: {
							displayName: true,
							username: true,
							avatar: true,
						},
					},
					amount: true,
					status: true,
					provider: true,
					createdAt: true,
				},
				orderBy: { createdAt: "asc" },
			});

			const cameoPayments = await prisma.cameoPayment.findMany({
				where: {
					creatorId: profile.id,
				},
				select: {
					id: true,
					userId: true,
					user: {
						select: {
							displayName: true,
							username: true,
							avatar: true,
						},
					},
					amount: true,
					status: true,
					createdAt: true,
				},
				orderBy: { createdAt: "asc" },
			});

			const subscriptionPayments =
				await prisma.paymentSubscriptionTransaction.findMany({
					where: {
						creatorId: profile.id,
					},
					select: {
						id: true,
						userId: true,
						user: {
							select: {
								displayName: true,
								username: true,
								avatar: true,
							},
						},
						paymentSubscription: {
							select: {
								amount: true,
							},
						},
						amount: true,
						status: true,
						createdAt: true,
					},
					orderBy: { createdAt: "asc" },
				});

			const tipsFormatted = tips.map((transaction) => {
				const {
					amount,
					processingFee,
					platformFee,
					totalFees,
					netAmount,
				} = feesCalculator.creatorGemsTransactionFee(
					transaction.amount,
					profile.platformFee,
				);

				return {
					...transaction,
					userId: transaction.spenderId,
					user: {
						username: transaction.spender.username,
						avatar: transaction.spender.avatar,
					},
					description: "Tip payment",
					status: transaction.status,
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee:
						processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					platformFee:
						platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					totalFees: totalFees.getAmount() / DECIMAL_TO_CENT_FACTOR,
					netAmount: netAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				};
			});

			const paidPostsFormatted = paidPosts.map((transaction) => {
				const {
					amount,
					processingFee,
					platformFee,
					totalFees,
					netAmount,
				} = feesCalculator.creatorPaidPostTransactionFee(
					transaction.amount,
					profile.platformFee,
					transaction.provider!,
				);

				return {
					...transaction,
					description: "Paid post purchase",
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee:
						processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					platformFee:
						platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					totalFees: totalFees.getAmount() / DECIMAL_TO_CENT_FACTOR,
					netAmount: netAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				};
			});

			const cameoPaymentsFormatted = cameoPayments.map((transaction) => {
				const {
					amount,
					processingFee,
					platformFee,
					totalFees,
					netAmount,
				} = feesCalculator.creatorCameoPaymentFee(
					transaction.amount,
					profile.platformFee,
				);

				return {
					...transaction,
					description: "Cameo payment",
					amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					processingFee:
						processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					platformFee:
						platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
					totalFees: totalFees.getAmount() / DECIMAL_TO_CENT_FACTOR,
					netAmount: netAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				};
			});

			const subscriptionPaymentsFormatted = subscriptionPayments.map(
				(transaction) => {
					const {
						amount,
						processingFee,
						platformFee,
						totalFees,
						netAmount,
					} = feesCalculator.creatorSubscriptionsTransactionFee(
						transaction.paymentSubscription.amount,
						profile.platformFee,
					);

					return {
						...transaction,
						description: "Subscription payment",
						amount: amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
						processingFee:
							processingFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
						platformFee:
							platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
						totalFees:
							totalFees.getAmount() / DECIMAL_TO_CENT_FACTOR,
						netAmount:
							netAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
					};
				},
			);

			const allTransactions = [
				...tipsFormatted,
				...paidPostsFormatted,
				...cameoPaymentsFormatted,
				...subscriptionPaymentsFormatted,
			];

			allTransactions.sort(
				(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
			);

			return reply.send({ transactions: allTransactions });
		},
	);

	fastify.post<{ Body: RefundReqBody }>(
		"/refund",
		{
			schema: {
				body: RefundReqBodyValidator,
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
			const profile = await session.getProfile(prisma);

			if (!profile) {
				return reply.sendError(APIErrors.PROFILE_NOT_FOUND);
			}

			const transactions = await Promise.all([
				prisma.gemsSpendingLog.findFirst({
					where: { id: BigInt(id), creatorId: profile.id },
				}),
				prisma.paidPostTransaction.findFirst({
					where: { id: BigInt(id), creatorId: profile.id },
				}),
				prisma.paymentSubscriptionTransaction.findFirst({
					where: { id: BigInt(id), creatorId: profile.id },
					select: {
						id: true,
						amount: true,
						status: true,
						transactionId: true,
						paymentSubscription: {
							select: {
								transactionId: true,
							},
						},
					},
				}),
				prisma.cameoPayment.findFirst({
					where: { id: BigInt(id), creatorId: profile.id },
				}),
			]);

			const validTransaction = transactions.find((transaction) =>
				Boolean(transaction),
			);

			if (!validTransaction) {
				return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);
			}

			if (validTransaction.status !== TransactionStatus.Successful) {
				return reply.sendError(APIErrors.CANNOT_REFUND_NOT_SUCCESSFUL);
			}

			if (transactions[0]) {
				const gemsSpendingLog = transactions[0];

				if (!gemsSpendingLog.id) {
					return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);
				}

				const balance = await prisma.balance.findFirst({
					where: { profileId: gemsSpendingLog.creatorId },
				});

				if (!balance) {
					return reply.sendError(APIErrors.BALANCE_NOT_FOUND);
				}

				const gemsBalance = await prisma.gemsBalance.findFirst({
					where: { userId: gemsSpendingLog.spenderId },
				});

				if (!gemsBalance) {
					return reply.sendError(APIErrors.GEMS_BALANCE_NOT_FOUND);
				}

				await prisma.$transaction(async (prisma) => {
					await prisma.balance.update({
						where: { id: balance.id },
						data: {
							amount: {
								decrement: gemExchangeService
									.gemExchange(gemsSpendingLog.amount)
									.getAmount(),
							},
						},
					});
					await prisma.gemsBalance.update({
						where: { id: gemsBalance.id },
						data: { amount: { increment: gemsSpendingLog.amount } },
					});

					await prisma.gemsSpendingLog.update({
						where: { id: gemsSpendingLog.id },
						data: { status: TransactionStatus.Refunded },
					});
				});

				await processCreatorReferralRefund(
					gemsSpendingLog.id.toString(),
					CreatorReferralTransactionType.Tip,
				);

				return reply.status(200).send({ success: true });
			} else if (transactions[1] || transactions[3]) {
				const paidPostTransaction = transactions[1] || transactions[3];

				if (!paidPostTransaction)
					return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);

				if (!paidPostTransaction.transactionId) {
					return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);
				}

				if (
					paidPostTransaction.status !== TransactionStatus.Successful
				) {
					return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);
				}

				const authorizeNetTransaction =
					await authorizeNetService.getTransactionDetails(
						paidPostTransaction.transactionId,
					);

				const transId = authorizeNetTransaction.transaction.transId;
				const cardNumber =
					authorizeNetTransaction.transaction.payment.creditCard
						.cardNumber;
				const last4Digits = cardNumber.slice(-4);
				const amount = (
					paidPostTransaction.amount / DECIMAL_TO_CENT_FACTOR
				).toFixed(2);

				const refund = await authorizeNetService.refundTransaction(
					transId,
					last4Digits,
					amount,
				);

				if (refund.getMessages().getResultCode() !== "Ok") {
					return reply.sendError(
						APIErrors.REFUND_FAILED(
							refund.getMessages().getMessage()[0].getText(),
						),
					);
				}

				if (refund.getTransactionResponse().getErrors()) {
					return reply.sendError(
						APIErrors.REFUND_FAILED(
							refund
								.getTransactionResponse()
								.getErrors()
								?.getError()[0]
								.getErrorText(),
						),
					);
				}

				if (transactions[1]) {
					await processCreatorReferralRefund(
						transactions[1].id.toString(),
						CreatorReferralTransactionType.PaidPost,
					);
				}

				return reply.status(200).send({ success: true });
			} else if (transactions[2]) {
				const paymentSubscriptionTransaction = transactions[2];

				if (!paymentSubscriptionTransaction.transactionId) {
					return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);
				}

				if (
					paymentSubscriptionTransaction.status !==
					TransactionStatus.Successful
				) {
					return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);
				}

				const authorizeNetTransaction =
					await authorizeNetService.getTransactionDetails(
						paymentSubscriptionTransaction.transactionId,
					);

				const transId = authorizeNetTransaction.transaction.transId;
				const cardNumber =
					authorizeNetTransaction.transaction.payment.creditCard
						.cardNumber;
				const last4Digits = cardNumber.slice(-4);
				const amount = (
					paymentSubscriptionTransaction.amount /
					DECIMAL_TO_CENT_FACTOR
				).toFixed(2);

				const refund = await authorizeNetService.refundTransaction(
					transId,
					last4Digits,
					amount,
				);

				if (refund.getMessages().getResultCode() !== "Ok") {
					return reply.sendError(
						APIErrors.REFUND_FAILED(
							refund.getMessages().getMessage()[0].getText(),
						),
					);
				}

				if (refund.getTransactionResponse().getErrors()) {
					return reply.sendError(
						APIErrors.REFUND_FAILED(
							refund
								.getTransactionResponse()
								.getErrors()
								?.getError()[0]
								.getErrorText(),
						),
					);
				}

				const subscription =
					await authorizeNetService.cancelSubscription(
						String(
							paymentSubscriptionTransaction.paymentSubscription
								.transactionId,
						),
					);

				if (subscription.getMessages().getResultCode() !== "Ok") {
					return reply.sendError(
						APIErrors.REFUND_FAILED(
							subscription
								.getMessages()
								.getMessage()[0]
								.getText(),
						),
					);
				}

				await processCreatorReferralRefund(
					paymentSubscriptionTransaction.id.toString(),
					CreatorReferralTransactionType.Subscription,
				);

				return reply.status(200).send({ success: true });
			}
		},
	);

	fastify.post<{
		Body: EarningsReqBody;
	}>(
		"/paid-post/earnings",
		{
			schema: {
				body: EarningsReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { startDate, endDate } = request.body;
			const session = request.session!;
			const profile = await session.getProfile(prisma);

			if (!profile) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			let start: Date;
			let end: Date;

			if (startDate) {
				start = new Date(startDate);
			} else {
				start = SnowflakeService.extractDate(profile.id);
			}

			if (!endDate) {
				end = new Date();
			} else {
				end = new Date(endDate);
			}

			start = new Date(start.setHours(0, 0, 0, 0));
			end = new Date(end.setHours(23, 59, 59, 999));

			const previousStart = new Date(start);
			const previousEnd = new Date(end);

			previousStart.setTime(
				previousStart.getTime() -
					(previousEnd.getTime() - previousStart.getTime()),
			);

			const dates = getDates(new Date(start), new Date(end));

			const transactions = await fetchTransactions(
				profile.id,
				previousStart,
				previousEnd,
				{
					includeGemsSpendingLogs: false,
					includeSubscriptionTransactions: false,
					includePaidPostTransactions: true,
					includeCameoPayments: false,
				},
			);

			const earningsByDate = new Map<string, number>();

			for (const date of dates) {
				let earnings = 0;
				const transactionsInDateRange = transactions
					.filter((transaction) => transaction.createdAt >= start)
					.filter(
						(transaction) =>
							transaction.createdAt >= date.startRange &&
							transaction.createdAt <= date.endRange,
					);

				for (const transaction of transactionsInDateRange) {
					earnings += transaction.amount / DECIMAL_TO_CENT_FACTOR;
				}

				earningsByDate.set(date.date.toISOString(), earnings);
			}

			const earningsResults = Array.from(
				earningsByDate,
				([date, earnings]) => ({ date, earnings }),
			);

			earningsResults.sort(
				(a, b) =>
					new Date(a.date).getTime() - new Date(b.date).getTime(),
			);

			const totalEarnings = earningsResults.reduce(
				(sum, record) => sum + record.earnings,
				0,
			);

			const previousPeriodEarnings = transactions.filter(
				(transaction) => transaction.createdAt < start,
			);

			const previousPeriodEarningsTotal = previousPeriodEarnings.reduce(
				(sum, record) => sum + record.amount / DECIMAL_TO_CENT_FACTOR,
				0,
			);

			const percentageDifference = calculatePercentageDifference(
				totalEarnings,
				previousPeriodEarningsTotal,
			);

			const daysDifference = Math.abs(
				(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
			);

			let period = "day";
			if (daysDifference > 7) period = "week";
			if (daysDifference > 31) period = "month";
			if (daysDifference > 365) period = "year";

			let periodLength = 1;
			switch (period) {
				case "day":
					periodLength = daysDifference;
					break;
				case "week":
					periodLength = daysDifference / 7;
					break;
				case "month":
					periodLength = daysDifference / 31;
					break;
				case "year":
					periodLength = daysDifference / 365;
					break;
			}

			periodLength = Number(periodLength.toFixed(0));

			const prevPeriodLabel = `Past${
				periodLength > 1 ? ` ${periodLength}` : ""
			} ${period}${periodLength > 1 ? "s" : ""}`;

			return reply.send({
				prevPeriodLabel: prevPeriodLabel,
				prevPeriodEarnings: previousPeriodEarningsTotal,
				prevPeriodEarningsDifference:
					totalEarnings - previousPeriodEarningsTotal,
				prevPeriodEarningsPercentageDifference: Number(
					percentageDifference.toFixed(2),
				),
				earnings: totalEarnings,
				purchases: transactions.length,
				period: period,
				timeline: earningsResults,
			});
		},
	);

	fastify.get(
		"/paid-post/bestselling",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = await session.getProfile(prisma);

			if (!profile) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			const groupedTransactions =
				await prisma.paidPostTransaction.groupBy({
					by: ["paidPostId"],
					_sum: {
						amount: true,
					},
					_count: {
						paidPostId: true,
					},
					where: {
						creatorId: profile.id,
						status: TransactionStatus.Successful,
					},
					orderBy: {
						_sum: {
							amount: "desc",
						},
					},
					take: 10,
				});

			const topPostsIds = groupedTransactions.map(
				(transaction) => transaction.paidPostId,
			);

			const topPostsData = await prisma.paidPost
				.findMany({
					where: {
						id: {
							in: topPostsIds,
						},
					},
					select: {
						id: true,
						price: true,
						post: true,
					},
				})
				.then((posts) =>
					posts.map((post) => ({
						...post.post,
						earnings:
							(groupedTransactions.find(
								(t) => t.paidPostId === post.id,
							)?._sum.amount ?? 0) / DECIMAL_TO_CENT_FACTOR,
						purchases:
							groupedTransactions.find(
								(t) => t.paidPostId === post.id,
							)?._count.paidPostId ?? 0,
						paidPost: {
							id: post.id,
							price: post.price,
						},
					})),
				);

			return reply.send(topPostsData);
		},
	);

	fastify.post<{
		Body: PaidPostEarningsReqBody;
	}>(
		"/paid-post/post/earnings",
		{
			schema: {
				body: PaidPostEarningsReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { postId, startDate, endDate } = request.body;
			const session = request.session!;
			const profile = await session.getProfile(prisma);

			if (!profile) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			const start = startDate ? new Date(startDate) : new Date();
			const end = endDate ? new Date(endDate) : new Date();

			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);

			const previousStart = new Date(start);
			const previousEnd = new Date(end);
			previousStart.setTime(
				previousStart.getTime() -
					(previousEnd.getTime() - previousStart.getTime()),
			);

			const dates = getDates(new Date(start), new Date(end));

			const transactions = await fetchTransactions(
				profile.id,
				previousStart,
				previousEnd,
				{
					includeGemsSpendingLogs: false,
					includeSubscriptionTransactions: false,
					includePaidPostTransactions: true,
					includeCameoPayments: false,
				},
			);

			const earningsByDate = new Map<string, number>();

			for (const date of dates) {
				let earnings = 0;
				const transactionsInDateRange = transactions
					.filter((transaction) => transaction.createdAt >= start)
					.filter(
						(transaction) =>
							transaction.createdAt >= date.startRange &&
							transaction.createdAt <= date.endRange,
					);

				for (const transaction of transactionsInDateRange) {
					earnings += transaction.amount / DECIMAL_TO_CENT_FACTOR;
				}

				earningsByDate.set(date.date.toISOString(), earnings);
			}

			const earningsResults = Array.from(
				earningsByDate,
				([date, earnings]) => ({ date, earnings }),
			);

			earningsResults.sort(
				(a, b) =>
					new Date(a.date).getTime() - new Date(b.date).getTime(),
			);

			const totalEarnings = earningsResults.reduce(
				(sum, record) => sum + record.earnings,
				0,
			);

			const previousPeriodEarnings = transactions.filter(
				(transaction) => transaction.createdAt < start,
			);

			const previousPeriodEarningsTotal = previousPeriodEarnings.reduce(
				(sum, record) => sum + record.amount / DECIMAL_TO_CENT_FACTOR,
				0,
			);

			const percentageDifference = calculatePercentageDifference(
				totalEarnings,
				previousPeriodEarningsTotal,
			);

			const daysDifference = Math.abs(
				(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
			);

			let period = "day";
			if (daysDifference > 7) period = "week";
			if (daysDifference > 31) period = "month";
			if (daysDifference > 365) period = "year";

			let periodLength = 1;
			switch (period) {
				case "day":
					periodLength = daysDifference;
					break;
				case "week":
					periodLength = daysDifference / 7;
					break;
				case "month":
					periodLength = daysDifference / 31;
					break;
				case "year":
					periodLength = daysDifference / 365;
					break;
			}

			periodLength = Number(periodLength.toFixed(0));

			const prevPeriodLabel = `Past${
				periodLength > 1 ? ` ${periodLength}` : ""
			} ${period}${periodLength > 1 ? "s" : ""}`;

			return reply.send({
				postId: postId,
				prevPeriodLabel: prevPeriodLabel,
				prevPeriodEarnings: previousPeriodEarningsTotal,
				prevPeriodEarningsDifference:
					totalEarnings - previousPeriodEarningsTotal,
				prevPeriodEarningsPercentageDifference: Number(
					percentageDifference.toFixed(2),
				),
				earnings: totalEarnings,
				purchases: transactions.length,
				period: period,
				timeline: earningsResults,
			});
		},
	);

	fastify.post<{
		Body: PaidPostPurchased;
	}>(
		"/paid-post/post/purchased",
		{
			schema: {
				body: PaidPostPurchasedValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;

			const profile = await session.getProfile(prisma);
			if (!profile) return reply.sendError(APIErrors.PROFILE_NOT_FOUND);

			const postId = request.body.postId;
			if (!postId) return reply.sendError(APIErrors.POST_NOT_FOUND);

			const post = await prisma.post.findFirst({
				where: {
					id: BigInt(postId),
					profileId: profile.id,
					NOT: {
						isPosted: false,
					},
				},
				select: { paidPost: true },
			});

			if (!post || !post.paidPost) {
				return reply.sendError(APIErrors.POST_NOT_FOUND);
			}

			const purchased = await prisma.paidPostTransaction.findMany({
				where: {
					paidPostId: BigInt(post.paidPost.id),
					creatorId: profile.id,
					status: TransactionStatus.Successful,
				},
				select: {
					user: {
						select: {
							id: true,
							username: true,
							avatar: true,
						},
					},
				},
				orderBy: { createdAt: "asc" },
			});

			return reply.send({ fans: purchased.map((p) => p.user) });
		},
	);
}
