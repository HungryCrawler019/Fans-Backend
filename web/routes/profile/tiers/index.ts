import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../../common/validators/validation.js";
import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	TierCreateReqBody,
	TierRespBody,
	TierUpdateReqBody,
	TiersRespBody,
} from "./schemas.js";
import {
	TierCreateReqBodyValidator,
	TierUpdateReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.get<{ Querystring: PageQuery }>(
		"/",
		{
			schema: { querystring: PageQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			const profile = (await session.getProfile(prisma))!;

			const total = await prisma.tier.count({
				where: { profileId: profile.id },
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			// get all tiers for profile
			const tiers = await prisma.tier.findMany({
				where: { profileId: profile.id },
				skip: (page - 1) * size,
				take: size,
			});

			const result: TiersRespBody = {
				tiers: tiers.map((t) => ModelConverter.toITier(t)),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Body: TierCreateReqBody }>(
		"/",
		{
			schema: {
				body: TierCreateReqBodyValidator,
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
			const data = request.body;

			const tierCount = await prisma.tier.count({
				where: { profileId: profile.id },
			});

			if (tierCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const created = await prisma.tier.create({
				data: {
					id: snowflake.gen(),
					title: data.title,
					price: data.price,
					currency: data.currency,
					description: data.description,
					cover: data.cover,
					perks: data.perks,
					profileId: profile.id,
				},
			});
			const result: TierRespBody = ModelConverter.toITier(created);
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: TierUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: TierUpdateReqBodyValidator,
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
			const { id } = request.params;
			const profile = (await session.getProfile(prisma))!;
			const data = request.body;
			const tier = await prisma.tier.findFirst({
				where: { id: BigInt(id) },
			});
			if (!tier) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Tier"));
			}
			if (tier.profileId !== profile.id) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}
			await prisma.tier.update({
				where: { id: BigInt(id) },
				data,
			});
			return reply.status(200).send();
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
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id } = request.params;
			const profile = (await session.getProfile(prisma))!;
			const tier = await prisma.tier.findFirst({
				where: {
					id: BigInt(id),
				},
			});
			if (!tier) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Tier"));
			}
			if (tier.profileId !== profile.id) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}
			await prisma.tier.delete({
				where: { id: BigInt(id) },
			});
			return reply.status(200).send();
		},
	);
}
