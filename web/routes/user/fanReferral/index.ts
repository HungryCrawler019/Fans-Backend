import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import APIErrors from "../../../errors/index.js";
import { FastifyTypebox } from "../../../types.js";
import {
	ActiveLinkSortType,
	ActiveLinksPageQueryParams,
	ActiveLinksRespBody,
	CodeParams,
	CreateFanReferralReqBody,
	EarningRespBody,
	FanReferralRespBody,
	LinkPerformanceQueryParams,
	LinkPerformanceRespBody,
	LinkPerformanceSortType,
	TransactionSortType,
	TransactionsQueryParams,
	TransactionsRespBody,
	UpdateFanReferralReqBody,
} from "./schemas.js";
import {
	ActiveLinksPageQueryParamsValidator,
	CodeParamsValidator,
	CreateFanReferralReqBodyValidator,
	LinkPerformanceQueryParamsValidator,
	TransactionsQueryParamsValidator,
	UpdateFanReferralReqBodyValidator,
} from "./validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import {
	DateFilterQueryParams,
	IdParams,
} from "../../../../common/validators/schemas.js";
import {
	DateFilterQueryParamsValidator,
	IdParamsValidator,
} from "../../../../common/validators/validation.js";
import { randomAlphaNumCode } from "../../../../common/utils/Common.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	const generateReferralCode = async () => {
		for (let i = 0; i < 10000; i++) {
			const code = randomAlphaNumCode(10);
			const existingCode = await prisma.fanReferral.findFirst({
				where: { code: code },
			});

			if (!existingCode) {
				return code;
			}
		}

		throw new Error("Attempts exceeded");
	};

	fastify.post<{ Body: CreateFanReferralReqBody }>(
		"/",
		{
			schema: { body: CreateFanReferralReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { profileId, code } = request.body;
			const profile = await prisma.profile.findFirst({
				where: { id: BigInt(profileId) },
			});
			if (!profile) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Profile"));
			}

			const existedCount = await prisma.fanReferral.count({
				where: { userId: BigInt(session.userId) },
			});

			if (existedCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const existed = code
				? await prisma.fanReferral.count({
						where: { code: code },
				  })
				: undefined;

			if (existed) {
				return reply.sendError(APIErrors.DUPLICATED_FAN_REFERRAL_CODE);
			}

			const fanReferralCode = code ?? (await generateReferralCode());
			await prisma.fanReferral.create({
				data: {
					id: snowflake.gen(),
					userId: BigInt(session.userId),
					profileId: BigInt(profileId),
					code: fanReferralCode,
				},
			});

			return reply.status(200).send({
				fanReferralCode: fanReferralCode,
			});
		},
	);

	fastify.put<{ Params: IdParams; Body: UpdateFanReferralReqBody }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: UpdateFanReferralReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: fanReferralId } = request.params;
			const { code } = request.body;
			const fanReferral = await prisma.fanReferral.findUnique({
				where: {
					id: BigInt(fanReferralId),
					userId: BigInt(session.userId),
				},
			});
			if (!fanReferral) {
				reply.sendError(APIErrors.ITEM_NOT_FOUND("Fan Referral"));
			}
			const existed = await prisma.fanReferral.count({
				where: { code: code, id: { not: BigInt(fanReferralId) } },
			});
			if (existed) {
				return reply.sendError(APIErrors.DUPLICATED_FAN_REFERRAL_CODE);
			}
			await prisma.fanReferral.update({
				where: { id: BigInt(fanReferralId) },
				data: { code: code },
			});
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: UpdateFanReferralReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: fanReferralId } = request.params;
			const existed = await prisma.fanReferral.findFirst({
				where: {
					id: BigInt(fanReferralId),
					userId: BigInt(session.userId),
				},
			});
			if (!existed) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}
			await prisma.fanReferral.delete({
				where: { id: BigInt(fanReferralId) },
			});
		},
	);

	fastify.get<{ Querystring: ActiveLinksPageQueryParams }>(
		"/active-links",
		{
			schema: {
				querystring: ActiveLinksPageQueryParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const {
				sort = ActiveLinkSortType.largest_percentage,
				query = "",
				page = 1,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;

			const total = await prisma.profile.count({
				where: {
					OR: [
						{
							displayName: {
								contains: query,
								mode: "insensitive",
							},
						},
						{
							user: {
								username: {
									contains: query,
									mode: "insensitive",
								},
							},
						},
					],
					fanReferrals: {
						some: { userId: BigInt(session.userId) },
					},
				},
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const rows = await prisma.profile.findMany({
				where: {
					OR: [
						{
							displayName: {
								contains: query,
								mode: "insensitive",
							},
						},
						{
							user: {
								username: {
									contains: query,
									mode: "insensitive",
								},
							},
						},
					],
					fanReferrals: {
						some: { userId: BigInt(session.userId) },
					},
				},
				orderBy:
					sort === ActiveLinkSortType.largest_percentage
						? [{ fanReferralShare: "desc" }]
						: undefined,
				include: {
					fanReferrals: true,
					fanReferralTransactions: true,
				},
				take: size,
				skip: (page - 1) * size,
			});

			const result: ActiveLinksRespBody = {
				activeLinks: rows
					.map((r) => ({
						...ModelConverter.toIProfile(r),
						totalEarned: r.fanReferralTransactions.reduce(
							(acc, current) => acc + current.amount,
							0,
						),
						totalVisitCount: r.fanReferrals.reduce(
							(acc, current) => acc + current.visitCount,
							0,
						),
						fanReferrals: r.fanReferrals.map((f) =>
							ModelConverter.toIFanReferral(f),
						),
					}))
					.sort((prev, next) => {
						return sort === ActiveLinkSortType.highest_ctr
							? -(prev.totalEarned - next.totalEarned)
							: sort === ActiveLinkSortType.highest_earning
							? -(prev.totalVisitCount - next.totalVisitCount)
							: 0;
					}),
				page,
				size,
				total,
			};
			reply.send(result);
		},
	);

	fastify.get<{ Params: IdParams }>(
		"/active-link/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: fanReferralId } = request.params;
			const fanReferral = await prisma.fanReferral.findFirst({
				where: {
					id: BigInt(fanReferralId),
					userId: BigInt(session.userId),
				},
				include: {
					profile: true,
					fanReferralTransactions: true,
				},
			});

			if (!fanReferral) {
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("Fan Referral"),
				);
			}
			const result: FanReferralRespBody = {
				...ModelConverter.toIFanReferral(fanReferral),
				profile: ModelConverter.toIProfile(fanReferral.profile),
				totalEarning: fanReferral.fanReferralTransactions.reduce(
					(acc, current) => acc + current.amount,
					0,
				),
				totalFans: new Set(
					fanReferral.fanReferralTransactions.map(
						(f) => f.referentId,
					),
				).size,
				transactions: fanReferral.fanReferralTransactions.map((t) =>
					ModelConverter.toIFanReferralTransaction(t),
				),
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Querystring: DateFilterQueryParams }>(
		"/earning",
		{
			schema: {
				querystring: DateFilterQueryParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { from, to } = request.query;
			const fanReferralTransactions =
				await prisma.fanReferralTransaction.findMany({
					where: {
						referrerId: BigInt(session.userId),
						updatedAt: {
							gte: from ? new Date(from) : undefined,
							lte: to ? new Date(to) : undefined,
						},
					},
					orderBy: { updatedAt: "asc" },
				});
			const totalEarning = fanReferralTransactions.reduce(
				(acc, current) => acc + current.amount,
				0,
			);

			let start: Date;
			let end: Date;

			if (from) {
				start = new Date(from);
			} else {
				start = SnowflakeService.extractDate(session.userId);
			}

			if (!to) {
				end = new Date();
			} else {
				end = new Date(to);
			}
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
			const result: EarningRespBody = {
				totalEarning: totalEarning,
				transactions: fanReferralTransactions.map((t) =>
					ModelConverter.toIFanReferralTransaction(t),
				),
				period: period,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Querystring: TransactionsQueryParams }>(
		"/transactions",
		{
			schema: { querystring: TransactionsQueryParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const {
				sort = TransactionSortType.daily,
				query = "",
				page = 1,
				from,
				to,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;

			const total = await prisma.fanReferralTransaction.count({
				where: {
					referrerId: BigInt(session.userId),
					creator: {
						OR: [
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								user: {
									username: {
										contains: query,
										mode: "insensitive",
									},
								},
							},
						],
					},
					updatedAt: {
						gte: from ? new Date(from) : undefined,
						lte: to ? new Date(to) : undefined,
					},
				},
				orderBy: { updatedAt: "desc" },
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const transactions = await prisma.fanReferralTransaction.findMany({
				where: {
					referrerId: BigInt(session.userId),
					updatedAt: {
						gte: from ? new Date(from) : undefined,
						lte: to ? new Date(to) : undefined,
					},
				},
				include: { creator: true },
				orderBy: { updatedAt: "desc" },
				skip: (page - 1) * size,
				take: size,
			});

			const result: TransactionsRespBody = {
				transactions: transactions.map((t) => ({
					...ModelConverter.toIFanReferralTransaction(t),
					creator: ModelConverter.toIProfile(t.creator),
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Querystring: LinkPerformanceQueryParams }>(
		"/link-performance",
		{
			schema: { querystring: LinkPerformanceQueryParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const {
				sort = LinkPerformanceSortType.highest_ctr,
				query = "",
				from,
				to,
				page = 1,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;

			const total = await prisma.fanReferral.count({
				where: {
					userId: BigInt(session.userId),
					profile: {
						OR: [
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								user: {
									username: {
										contains: query,
										mode: "insensitive",
									},
								},
							},
						],
					},
				},
				orderBy:
					sort === LinkPerformanceSortType.highest_ctr
						? { visitCount: "desc" }
						: undefined,
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const fanReferrals = await prisma.fanReferral.findMany({
				where: {
					userId: BigInt(session.userId),
					profile: {
						OR: [
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								user: {
									username: {
										contains: query,
										mode: "insensitive",
									},
								},
							},
						],
					},
				},
				include: {
					fanReferralTransactions: {
						where: {
							updatedAt: {
								gte: from ? new Date(from) : undefined,
								lte: to ? new Date(to) : undefined,
							},
						},
					},
					profile: true,
				},
				orderBy:
					sort === LinkPerformanceSortType.highest_ctr
						? { visitCount: "desc" }
						: undefined,
				skip: (page - 1) * size,
				take: size,
			});

			const result: LinkPerformanceRespBody = {
				fanReferrals: fanReferrals.map((f) => ({
					...ModelConverter.toIFanReferral(f),
					profile: ModelConverter.toIProfile(f.profile),
					fanReferralTransactions: f.fanReferralTransactions.map(
						(t) => ModelConverter.toIFanReferralTransaction(t),
					),
				})),
				page,
				size,
				total,
			};

			return reply.send(result);
		},
	);

	fastify.post<{ Params: CodeParams }>(
		"/visit/:code",
		{
			schema: { params: CodeParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { code } = request.params;
			const fanReferral = await prisma.fanReferral.findFirst({
				where: {
					code: {
						equals: code,
						mode: "insensitive",
					},
				},
			});

			if (!fanReferral) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("FanReferral"));
			}

			await prisma.fanReferral.update({
				where: { code: code },
				data: { visitCount: { increment: 1 } },
			});
			reply.send();
		},
	);
}
