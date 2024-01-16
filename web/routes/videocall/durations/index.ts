import { Logger } from "pino";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { FastifyTypebox } from "../../../types.js";
import {
	CreateMeetingDurationBody,
	UpdateMeetingDurationBody,
	UpdateMeetingEnabledBody,
} from "./schemas.js";
import {
	CreateMeetingDurationBodyValidator,
	UpdadteMeetingDurationBodyValidator,
	UpdateMeetingEnabledBodyValidator,
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

	fastify.post<{ Body: CreateMeetingDurationBody }>(
		"/",
		{
			schema: { body: CreateMeetingDurationBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const durations = await prisma.meetingDuration.findMany({
				where: { creatorId: creator.id },
			});
			if (
				durations.some(
					(duration) => duration.length === request.body.length,
				)
			) {
				return reply.sendError(APIErrors.DURATION_CONFLICT);
			}

			const duration = await prisma.meetingDuration.create({
				data: {
					id: snowflake.gen(),
					length: request.body.length,
					price: Number(request.body.price).toFixed(2),
					currency: request.body.currency,
					creatorId: creator.id,
					isEnabled: request.body.isEnabled ?? true,
				},
			});

			return reply.send(ModelConverter.toIMeetingDuration(duration));
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

			const durations = await prisma.meetingDuration.findMany({
				where: { creatorId: creator.id },
			});

			return reply.send(durations.map(ModelConverter.toIMeetingDuration));
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

			const duration = await prisma.meetingDuration.findFirst({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
			});
			if (!duration) {
				return reply.sendError(APIErrors.DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeetingDuration(duration));
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

			const duration = await prisma.meetingDuration.delete({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
			});
			if (!duration) {
				return reply.sendError(APIErrors.DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeetingDuration(duration));
		},
	);

	fastify.put<{ Body: CreateMeetingDurationBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: CreateMeetingDurationBodyValidator,
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

			const duration = await prisma.meetingDuration.update({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
				data: {
					length: request.body.length,
					price: Number(request.body.price).toFixed(2),
					currency: request.body.currency,
					isEnabled: request.body.isEnabled ?? true,
				},
			});
			if (!duration) {
				return reply.sendError(APIErrors.DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeetingDuration(duration));
		},
	);

	fastify.patch<{ Body: UpdateMeetingDurationBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: UpdadteMeetingDurationBodyValidator,
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
			const { length, price, currency, isEnabled } = request.body;

			const duration = await prisma.meetingDuration.update({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
				data: {
					...(length !== undefined ? { length } : {}),
					...(price !== undefined
						? { price: Number(request.body.price).toFixed(2) }
						: {}),
					...(currency !== undefined ? { currency } : {}),
					...(isEnabled !== undefined ? { isEnabled } : {}),
				},
			});
			if (!duration) {
				return reply.sendError(APIErrors.DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeetingDuration(duration));
		},
	);

	fastify.put<{ Body: UpdateMeetingEnabledBody; Params: IdParams }>(
		"/:id/enabled",
		{
			schema: {
				params: IdParamsValidator,
				body: UpdateMeetingEnabledBodyValidator,
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

			const duration = await prisma.meetingDuration.update({
				where: { id: BigInt(request.params.id), creatorId: creator.id },
				data: { isEnabled: request.body.isEnabled },
			});
			if (!duration) {
				return reply.sendError(APIErrors.DURATION_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeetingDuration(duration));
		},
	);
}
