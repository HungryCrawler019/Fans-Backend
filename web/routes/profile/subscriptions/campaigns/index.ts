import PrismaService from "../../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../../common/validators/validation.js";
import APIErrors from "../../../../errors/index.js";
import { ModelConverter } from "../../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../../types.js";
import { CampaignCreateBody } from "../campaigns/schemas.js";
import { CampaignRespBody, CampaignUpdateBody } from "./schemas.js";
import {
	CampaignCreateBodyValidator,
	CampaignUpdateBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.get<{ Params: IdParams }>(
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
			const campaign = await prisma.campaign.findFirst({
				where: {
					id: BigInt(id),
					subscription: {
						profileId: profile.id,
					},
				},
			});
			if (!campaign)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Campaign"));

			const result: CampaignRespBody =
				ModelConverter.toICampaign(campaign);
			return reply.send(result);
		},
	);

	fastify.post<{ Body: CampaignCreateBody }>(
		"/",
		{
			schema: {
				body: CampaignCreateBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const data = request.body;
			const profile = (await session.getProfile(prisma))!;
			const subscription = await prisma.subscription.findFirst({
				where: {
					profileId: profile.id,
				},
			});
			if (!subscription) {
				return reply.sendError(
					APIErrors.INVALID_REQUEST(
						"You don't have any active subscriptions!",
					),
				);
			}

			const campaignCount = await prisma.campaign.count({
				where: {
					subscription: {
						profileId: profile.id,
					},
				},
			});

			if (campaignCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const created = await prisma.campaign.create({
				data: {
					id: snowflake.gen(),
					duration: data.duration,
					durationType: data.durationType,
					endDate: data.endDate ? new Date(data.endDate) : null,
					limit: data.limit || 0,
					discount: data.discount || 0,
					type: data.type,
					applicable: data.applicable,
					subscriptionId: subscription.id,
				},
			});
			const result = ModelConverter.toICampaign(created);
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: CampaignUpdateBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: CampaignUpdateBodyValidator,
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
			const { id } = request.params;
			const campaign = await prisma.campaign.findFirst({
				where: {
					id: BigInt(id),
					subscription: {
						profileId: profile.id,
					},
				},
				select: {
					subscription: {
						select: {
							profile: {
								select: {
									userId: true,
								},
							},
						},
					},
				},
			});

			if (!campaign)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Bundle"));

			await prisma.campaign.update({
				where: { id: BigInt(id) },
				data: {
					...data,
					endDate: data.endDate ? new Date(data.endDate) : undefined,
				},
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
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { id } = request.params;
			const campaign = await prisma.campaign.findFirst({
				where: {
					id: BigInt(id),
					subscription: {
						profileId: profile.id,
					},
				},
				select: {
					subscription: {
						select: {
							profile: {
								select: {
									userId: true,
								},
							},
						},
					},
				},
			});
			if (!campaign)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Campaign"));

			await prisma.campaign.delete({ where: { id: BigInt(id) } });
			return reply.status(200).send();
		},
	);
}
