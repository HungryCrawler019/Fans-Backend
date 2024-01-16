import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import { ScheduleRespBody, ScheduleUpdateReqBody } from "./schemas.js";
import { ScheduleUpdateReqBodyValidator } from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);

	fastify.get<{ Params: IdParams }>(
		"/:id",
		{
			schema: { params: IdParamsValidator },
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				const row = await prisma.schedule.findFirst({
					where: { id: BigInt(id) },
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Schedule"),
					);
				const result: ScheduleRespBody =
					ModelConverter.toISchedule(row);
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: ScheduleUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: ScheduleUpdateReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				const data = request.body;

				const schedule = await prisma.schedule.findFirst({
					where: { id: BigInt(id) },
				});
				if (!schedule)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Schedule"),
					);

				await prisma.schedule.update({
					where: { id: BigInt(id) },
					data,
				});
				return reply
					.status(202)
					.send({ message: "Schedule is updated!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{ schema: { params: IdParamsValidator } },
		async (request, reply) => {
			try {
				const { id } = request.params;
				const row = await prisma.schedule.findFirst({
					where: { id: BigInt(id) },
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Schedule"),
					);
				await prisma.schedule.delete({ where: { id: BigInt(id) } });
				return reply
					.status(202)
					.send({ message: "Schedule is deleted!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
