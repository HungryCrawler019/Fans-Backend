import { Logger } from "pino";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { FastifyTypebox } from "../../../types.js";
import {
	CreateCustomVideoDurationBody,
	UpdateCustomVideoDurationEnabledBody,
} from "./schemas.js";
import {
	CreateCustomVideoDurationBodyValidator,
	UpdateCustomVideoDurationEnabledBodyValidator,
} from "./validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import APIErrors from "../../../errors/index.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);

	fastify.post<{ Body: CreateCustomVideoDurationBody }>(
		"/",
		{
			schema: { body: CreateCustomVideoDurationBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const durations = await prisma.customVideoDuration.findMany({
				where: { creatorId: creator.id },
			});
			if (
				durations.some(
					(duration) => duration.length === request.body.length,
				)
			) {
				return reply.sendError(APIErrors.CAMEO_DURATION_CONFLICT);
			}

			const duration = await prisma.customVideoDuration.create({
				data: {
					id: snowflake.gen(),
					length: request.body.length,
					price: Number(request.body.price).toFixed(2),
					currency: request.body.currency,
					creatorId: creator.id,
					isEnabled: request.body.isEnabled ?? true,
				},
			});

			return reply.send(ModelConverter.toICameoDuration(duration));
		},
	);

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
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const durations = await prisma.customVideoDuration.findMany({
				where: { creatorId: creator.id },
			});

			return reply.send(durations.map(ModelConverter.toICameoDuration));
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
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const duration = await prisma.customVideoDuration.findFirst({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
			});
			if (!duration) {
				return reply.sendError(APIErrors.CAMEO_DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toICameoDuration(duration));
		},
	);

	fastify.delete<{ Params: IdParams }>(
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
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const duration = await prisma.customVideoDuration.delete({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
			});
			if (!duration) {
				return reply.sendError(APIErrors.CAMEO_DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toICameoDuration(duration));
		},
	);

	fastify.put<{
		Body: UpdateCustomVideoDurationEnabledBody;
		Params: IdParams;
	}>(
		"/:id/enabled",
		{
			schema: {
				params: IdParamsValidator,
				body: UpdateCustomVideoDurationEnabledBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const duration = await prisma.customVideoDuration.update({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
				data: { isEnabled: request.body.isEnabled },
			});
			if (!duration) {
				return reply.sendError(APIErrors.CAMEO_DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toICameoDuration(duration));
		},
	);
}
