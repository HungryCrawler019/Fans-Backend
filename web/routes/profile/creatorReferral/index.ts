import {
	CreatorReferralTransactionType,
	SubscriptionStatus,
} from "@prisma/client";
import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { randomAlphaNumCode } from "../../../../common/utils/Common.js";
import {
	IdParams,
	QueryWithPageParams,
} from "../../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	QueryWithPageParamsValidator,
} from "../../../../common/validators/validation.js";
import APIErrors from "../../../errors/index.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	CodeParams,
	CodeWithDateFilterQueryParams,
	CreateCreatorReferralReqBody,
	CreatorReferralFilterQueryParams,
	CreatorReferralRespBody,
	CreatorReferralSortType,
	CreatorReferralsRespBody,
	CreatorsRespBody,
	EarningRespBody,
	LinkPerformanceRespBody,
	ReferentFilterQueryParams,
	ReferentSortType,
	TransactionsRespBody,
	UpdateCreatorReferralReqBody,
} from "./schemas.js";
import {
	CodeParamsValidator,
	CodeWithDateFilterQueryParamsValidator,
	CreateCreatorReferralReqBodyValidator,
	CreatorReferralFilterQueryParamsValidator,
	ReferentFilterQueryParamsValidator,
	UpdateCreatorReferralReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);

	const generateCreatorReferralCode = async (username: string) => {
		const oldCreatorReferral = await prisma.creatorReferral.findFirst({
			where: {
				code: { equals: username.slice(0, 20), mode: "insensitive" },
			},
		});
		if (!oldCreatorReferral) {
			return username.slice(0, 20);
		}

		for (let i = 0; i < 10000; i++) {
			if (username.length > 15) {
				username = username.slice(0, 15);
			}
			const code = `${username}${randomAlphaNumCode(5)}`;
			const existingCreatorReferral =
				await prisma.creatorReferral.findFirst({
					where: {
						code: {
							equals: code,
							mode: "insensitive",
						},
					},
				});

			if (!existingCreatorReferral) {
				return code;
			}
		}

		throw new Error("Attempts exceeded");
	};

	fastify.get(
		"/",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = (await session.getProfile(prisma))!;
			const creatorReferrals = await prisma.creatorReferral.findMany({
				where: { profileId: profile.id },
			});

			if (creatorReferrals.length > 0) {
				const result: CreatorReferralsRespBody = {
					creatorReferrals: creatorReferrals.map((c) =>
						ModelConverter.toICreatorReferral(c),
					),
				};
				return reply.send(result);
			}

			const created = await prisma.creatorReferral.create({
				data: {
					id: snowflake.gen(),
					profileId: profile.id,
					code: user.username
						? await generateCreatorReferralCode(user.username)
						: randomAlphaNumCode(12),
				},
			});

			const result: CreatorReferralsRespBody = {
				creatorReferrals: [ModelConverter.toICreatorReferral(created)],
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Params: IdParams }>(
		"/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { id } = request.params;

			const row = await prisma.creatorReferral.findFirst({
				where: { id: BigInt(id), profileId: profile.id },
			});
			if (!row) {
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("Creator Referral"),
				);
			}

			const result: CreatorReferralRespBody =
				ModelConverter.toICreatorReferral(row);
			return reply.status(200).send(result);
		},
	);

	fastify.post<{ Body: CreateCreatorReferralReqBody }>(
		"/",
		{
			schema: {
				body: CreateCreatorReferralReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { code } = request.body;
			const duplicatedCreatorReferral =
				await prisma.creatorReferral.findFirst({
					where: {
						code: {
							equals: code,
							mode: "insensitive",
						},
					},
				});
			if (duplicatedCreatorReferral) {
				return reply.sendError(
					APIErrors.DUPLICATED_CREATOR_REFERRAL_CODE,
				);
			}
			const created = await prisma.creatorReferral.create({
				data: {
					id: snowflake.gen(),
					profileId: profile.id,
					code,
				},
			});

			const result: CreatorReferralRespBody =
				ModelConverter.toICreatorReferral(created);
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: UpdateCreatorReferralReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: UpdateCreatorReferralReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { id } = request.params;
			const { code } = request.body;
			const creatorReferral = await prisma.creatorReferral.findUnique({
				where: { id: BigInt(id), profileId: profile.id },
			});

			if (!creatorReferral) {
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("Creator Referral"),
				);
			}

			const duplicatedCreatorReferral =
				await prisma.creatorReferral.findFirst({
					where: {
						code: {
							equals: code,
							mode: "insensitive",
						},
						id: { not: BigInt(id) },
					},
				});
			if (duplicatedCreatorReferral) {
				return reply.sendError(
					APIErrors.DUPLICATED_CREATOR_REFERRAL_CODE,
				);
			}

			await prisma.$transaction([
				prisma.profile.updateMany({
					where: { referrerCode: creatorReferral.code },
					data: { referrerCode: code },
				}),
				prisma.creatorReferral.update({
					where: { id: BigInt(id) },
					data: { code },
				}),
			]);

			return reply.status(202).send();
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { id } = request.params;

			const creatorReferral = await prisma.creatorReferral.findUnique({
				where: { id: BigInt(id), profileId: profile.id },
			});

			if (!creatorReferral) {
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("Creator Referral"),
				);
			}

			await prisma.$transaction([
				prisma.profile.updateMany({
					where: { referrerCode: creatorReferral.code },
					data: { referrerCode: null },
				}),
				prisma.creatorReferral.delete({
					where: { id: BigInt(id) },
				}),
			]);

			return reply.status(202).send();
		},
	);

	fastify.get<{ Querystring: CodeWithDateFilterQueryParams }>(
		"/earning",
		{
			schema: {
				querystring: CodeWithDateFilterQueryParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { code, from, to } = request.query;
			const creatorReferralTransactions =
				await prisma.creatorReferralTransaction.findMany({
					where: {
						referrerId: profile.id,
						updatedAt: {
							gte: from ? new Date(from) : undefined,
							lte: to ? new Date(to) : undefined,
						},
						referent: code ? { referrerCode: code } : undefined,
					},
					orderBy: { updatedAt: "asc" },
				});
			const totalEarning = creatorReferralTransactions.reduce(
				(accumulator, currentValue) =>
					accumulator + currentValue.amount,
				0,
			);
			const creatorCount = await prisma.profile.count({
				where: {
					referrerCode: code,
					referrer: { profileId: profile.id },
				},
			});

			const creatorReferralFee = process.env.CREATOR_REFERRAL_FEE
				? Number(process.env.CREATOR_REFERRAL_FEE)
				: 0.1;

			let start: Date;
			let end: Date;

			if (from) {
				start = new Date(from);
			} else {
				start = SnowflakeService.extractDate(profile.id);
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
				percentage: 100 * creatorReferralFee,
				creatorCount: creatorCount,
				transactions: creatorReferralTransactions.map((c) =>
					ModelConverter.toICreatorReferralTransaction(c),
				),
				period,
			};
			reply.send(result);
		},
	);

	fastify.get<{ Querystring: ReferentFilterQueryParams }>(
		"/creators",
		{
			schema: {
				querystring: ReferentFilterQueryParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { code, from, to, sort } = request.query;
			const referentIdsWithAmount =
				await prisma.creatorReferralTransaction.groupBy({
					by: ["referentId"],
					_sum: { amount: true },
					where: {
						referrerId: profile.id,
						updatedAt: {
							gte: from ? new Date(from) : undefined,
							lte: to ? new Date(to) : undefined,
						},
						referent: code ? { referrerCode: code } : undefined,
					},
					orderBy:
						sort === ReferentSortType.highest_earnings
							? { _sum: { amount: "desc" } }
							: sort === ReferentSortType.highest_mmr
							? { _count: { id: "desc" } }
							: undefined,
				});

			const referents = await prisma.profile.findMany({
				where: {
					referrerCode: code,
					referrer: { profileId: profile.id },
				},
				include: {
					paymentSubscriptions: {
						where: { status: SubscriptionStatus.Active },
					},
				},
			});

			const result: CreatorsRespBody = {
				creators: [
					...referentIdsWithAmount.map((r) => ({
						referentId: r.referentId.toString(),
						amount: r._sum.amount ?? undefined,
						referent:
							referents.findIndex(
								(ret) => ret.id === r.referentId,
							) > -1
								? ModelConverter.toIProfile(
										referents[
											referents.findIndex(
												(ret) =>
													ret.id === r.referentId,
											)
										],
								  )
								: null,
						subscriberCount:
							referents.findIndex(
								(ret) => ret.id === r.referentId,
							) > -1
								? referents[
										referents.findIndex(
											(ret) => ret.id === r.referentId,
										)
								  ].paymentSubscriptions.length
								: null,
					})),
					...referents
						.filter(
							(ret) =>
								referentIdsWithAmount.findIndex(
									(r) => r.referentId === ret.id,
								) < 0,
						)
						.map((ret) => ({
							referentId: ret.id.toString(),
							amount: 0,
							referent: ModelConverter.toIProfile(ret),
							subscriberCount: ret.paymentSubscriptions.length,
						})),
				],
			};

			reply.send(result);
		},
	);

	fastify.get<{ Querystring: CreatorReferralFilterQueryParams }>(
		"/link-performance",
		{
			schema: {
				querystring: CreatorReferralFilterQueryParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { from, to, sort } = request.query;
			const creatorReferrals = await prisma.creatorReferral.findMany({
				where: {
					profileId: profile.id,
				},
				include: {
					referredProfiles: {
						include: {
							referentCreatorReferralTransactions: {
								where: {
									updatedAt: {
										gte: from ? new Date(from) : undefined,
										lte: to ? new Date(to) : undefined,
									},
								},
							},
						},
					},
					_count: {
						select: { referredProfiles: true },
					},
				},
			});

			const creatorReferralFee = process.env.CREATOR_REFERRAL_FEE
				? Number(process.env.CREATOR_REFERRAL_FEE)
				: 0.1;

			const sortedCreatorReferrals = creatorReferrals
				.map((cr) => ({
					id: cr.id.toString(),
					code: cr.code,
					amount: cr.referredProfiles.reduce(
						(acc1, currentProfile) => {
							return (
								acc1 +
								currentProfile.referentCreatorReferralTransactions.reduce(
									(acc2, currentTransaction) =>
										acc2 + currentTransaction.amount,
									0,
								)
							);
						},
						0,
					),
					referentCount: cr._count.referredProfiles,
					visitCount: cr.visitCount,
					percentage: creatorReferralFee,
				}))
				.sort((a, b) =>
					sort === CreatorReferralSortType.highest_earnings
						? b.amount - a.amount
						: sort === CreatorReferralSortType.highest_ctr
						? b.referentCount - a.referentCount
						: 0,
				);

			const result: LinkPerformanceRespBody = {
				creatorReferrals: sortedCreatorReferrals,
			};

			reply.send(result);
		},
	);

	fastify.get<{ Querystring: QueryWithPageParams }>(
		"/transactions",
		{
			schema: { querystring: QueryWithPageParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const {
				query = "",
				page = 1,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;

			const total = await prisma.creatorReferralTransaction.count({
				where: {
					referrerId: profile.id,
					referent: {
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
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}
			const transactions =
				await prisma.creatorReferralTransaction.findMany({
					where: {
						referrerId: profile.id,
						referent: {
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
						referent: {
							include: { user: true },
						},
					},
					skip: (page - 1) * size,
					take: size,
				});
			const result: TransactionsRespBody = {
				transactions: transactions.map((t) => ({
					...ModelConverter.toICreatorReferralTransaction(t),
					referent: {
						...ModelConverter.toIProfile(t.referent),
						user: t.referent.user
							? ModelConverter.toIUser(t.referent.user)
							: undefined,
					},
				})),
				page,
				size,
				total,
			};
			reply.send(result);
		},
	);

	fastify.post<{ Params: CodeParams }>(
		"/visit/:code",
		{
			schema: { params: CodeParamsValidator },
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			const { code } = request.params;
			const creatorReferral = await prisma.creatorReferral.findFirst({
				where: {
					code: {
						equals: code,
						mode: "insensitive",
					},
				},
			});

			if (!creatorReferral) {
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("CreatorReferral"),
				);
			}

			await prisma.creatorReferral.update({
				where: { code: creatorReferral.code },
				data: { visitCount: { increment: 1 } },
			});
			reply.send();
		},
	);
}
