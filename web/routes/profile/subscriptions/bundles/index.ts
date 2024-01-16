import APIErrors from "../../../../errors/index.js";
import PrismaService from "../../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../../common/validators/validation.js";
import { ModelConverter } from "../../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../../types.js";
import { BundleCreateBody } from "../bundles/schemas.js";
import { BundleRespBody, BundleUpdateBody } from "./schemas.js";
import {
	BundleCreateReqBodyValidator,
	BundleUpdateReqBodyValidator,
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
			const { id } = request.params;
			const bundle = await prisma.bundle.findFirst({
				where: { id: BigInt(id) },
			});
			if (!bundle)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Bundle"));
			const result: BundleRespBody = ModelConverter.toIBundle(bundle);
			return reply.send(result);
		},
	);

	fastify.post<{ Body: BundleCreateBody }>(
		"/",
		{
			schema: {
				body: BundleCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			// get user subscription
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

			const bundleCount = await prisma.bundle.count({
				where: {
					subscription: {
						profileId: profile.id,
					},
				},
			});

			if (bundleCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const created = await prisma.bundle.create({
				data: {
					id: snowflake.gen(),
					title: data?.title || "",
					month: data?.month,
					discount: data.discount,
					limit: data.limit || 0,
					subscriptionId: subscription.id,
				},
			});
			const result = ModelConverter.toIBundle(created);
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: BundleUpdateBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: BundleUpdateReqBodyValidator,
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
			const bundle = await prisma.bundle.findFirst({
				where: { id: BigInt(id) },
				select: {
					subscription: {
						select: { profileId: true },
					},
				},
			});
			if (!bundle)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Bundle"));
			if (bundle.subscription?.profileId !== profile.id)
				return reply.sendError(APIErrors.PERMISSION_ERROR);

			await prisma.bundle.update({
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
			const profile = (await session.getProfile(prisma))!;
			const { id } = request.params;
			const bundle = await prisma.bundle.findFirst({
				where: { id: BigInt(id) },
				select: {
					subscription: {
						select: { profileId: true },
					},
				},
			});
			if (!bundle)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Bundle"));
			if (bundle.subscription?.profileId !== profile.id)
				return reply.sendError(APIErrors.PERMISSION_ERROR);

			await prisma.bundle.delete({ where: { id: BigInt(id) } });
			return reply.status(200).send();
		},
	);

	fastify.post<{ Params: IdParams }>(
		"/active/:id",
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
			const bundle = await prisma.bundle.findFirst({
				where: { id: BigInt(id) },
				select: {
					subscription: {
						select: { profileId: true },
					},
				},
			});
			if (!bundle)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Bundle"));
			if (bundle.subscription?.profileId !== profile.id)
				return reply.sendError(APIErrors.PERMISSION_ERROR);

			const updated = await prisma.bundle.update({
				where: { id: BigInt(id) },
				data: { isActive: true },
			});
			const result: BundleRespBody = ModelConverter.toIBundle(updated);
			return reply.status(200).send(result);
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/active/:id",
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
			const bundle = await prisma.bundle.findFirst({
				where: { id: BigInt(id) },
				select: {
					subscription: {
						select: { profileId: true },
					},
				},
			});
			if (!bundle)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Bundle"));
			if (bundle.subscription?.profileId !== profile.id)
				return reply.sendError(APIErrors.PERMISSION_ERROR);

			const updated = await prisma.bundle.update({
				where: { id: BigInt(id) },
				data: { isActive: false },
			});
			const result: BundleRespBody = ModelConverter.toIBundle(updated);
			return reply.status(200).send(result);
		},
	);
}
