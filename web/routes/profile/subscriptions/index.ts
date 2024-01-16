import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import APIErrors from "../../../errors/index.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	SubscriptionCreateReqBody,
	SubscriptionRespBody,
	SubscriptionUpdateReqBody,
	SubscriptionsRespBody,
} from "./schemas.js";
import {
	SubscriptionCreateReqBodyValidator,
	SubscriptionUpdateReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);

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
			const profile = (await session.getProfile(prisma))!;
			// get all tiers for profile
			const subscriptions = await prisma.subscription.findMany({
				where: {
					profileId: profile.id,
				},
				include: {
					campaigns: true,
					bundles: true,
				},
			});

			const result: SubscriptionsRespBody = {
				subscriptions: subscriptions.map((s) => ({
					...ModelConverter.toISubscription(s),
					campaigns: s.campaigns.map((c) =>
						ModelConverter.toICampaign(c),
					),
					bundles: s.bundles.map((b) => ModelConverter.toIBundle(b)),
				})),
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
			const { id } = request.params;
			const profile = (await session.getProfile(prisma))!;
			const row = await prisma.subscription.findFirst({
				where: {
					id: BigInt(id),
					profileId: profile.id,
				},
				include: {
					campaigns: true,
					bundles: true,
				},
			});
			if (!row)
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("Subscription"),
				);
			const result: SubscriptionRespBody = {
				...ModelConverter.toISubscription(row),
				campaigns: row.campaigns.map((c) =>
					ModelConverter.toICampaign(c),
				),
				bundles: row.bundles.map((b) => ModelConverter.toIBundle(b)),
			};

			return reply.send(result);
		},
	);

	fastify.post<{ Body: SubscriptionCreateReqBody }>(
		"/",
		{
			schema: {
				body: SubscriptionCreateReqBodyValidator,
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
			const { campaigns, bundles, ...data } = request.body;

			// create
			const created = await prisma.subscription.create({
				include: {
					campaigns: true,
					bundles: true,
				},
				data: {
					id: snowflake.gen(),
					profileId: profile.id,
					title: data.title,
					currency: data.currency,
					price: data.price,
					campaigns:
						campaigns && campaigns.length > 0
							? {
									createMany: {
										data: campaigns.map((c) => ({
											id: snowflake.gen(),
											duration: c.duration,
											type: c.type,
											discount: c.discount || 0,
											limit: c.limit || 0,
										})),
									},
							  }
							: undefined,
					bundles:
						bundles && bundles.length > 0
							? {
									createMany: {
										data: bundles.map((b) => ({
											id: snowflake.gen(),
											title: b.title || "",
											month: b.month,
											discount: b.discount,
											limit: b.limit || 0,
										})),
									},
							  }
							: undefined,
				},
			});
			const result: SubscriptionRespBody = {
				...ModelConverter.toISubscription(created),
				campaigns: created.campaigns.map((c) =>
					ModelConverter.toICampaign(c),
				),
				bundles: created.bundles.map((b) =>
					ModelConverter.toIBundle(b),
				),
			};
			return reply.status(201).send(result);
		},
	);

	/**
	 * Update subscription by ID
	 */
	fastify.put<{ Params: IdParams; Body: SubscriptionUpdateReqBody }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: SubscriptionUpdateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.params;
			const subscription = await prisma.subscription.findFirst({
				where: { id: BigInt(id) },
			});
			if (!subscription) {
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("Subscription"),
				);
			}
			const data = request.body;
			await prisma.subscription.update({
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
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id } = request.params;
			const profile = (await session.getProfile(prisma))!;
			const subscription = await prisma.subscription.findFirst({
				where: {
					id: BigInt(id),
				},
			});
			if (!subscription) {
				return reply.sendError(
					APIErrors.ITEM_NOT_FOUND("Subscription"),
				);
			}
			if (subscription.profileId !== profile.id) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}
			await prisma.subscription.delete({
				where: { id: BigInt(id) },
			});
			return reply.status(200).send();
		},
	);
}
