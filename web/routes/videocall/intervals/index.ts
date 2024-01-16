import { Logger } from "pino";
import { DateTime, Interval } from "luxon";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { FastifyTypebox } from "../../../types.js";
import { CreateMeetingIntervalBody } from "./schemas.js";
import { CreateMeetingIntervalBodyValidator } from "./validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import APIErrors from "../../../errors/index.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);

	fastify.post<{ Body: CreateMeetingIntervalBody }>(
		"/",
		{
			schema: { body: CreateMeetingIntervalBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const startDateTime = DateTime.fromISO(request.body.startTime)
				.set({
					weekday: request.body.day + 1,
				})
				.toUTC();

			const endDateTime = startDateTime.plus({
				minutes: request.body.length,
			});
			const timeInterval = Interval.fromDateTimes(
				startDateTime,
				endDateTime,
			);
			if (!timeInterval.isValid) {
				return reply.sendError(APIErrors.INVALID_INTERVAL);
			}

			const existingIntervals = await prisma.meetingInterval.findMany({
				where: {
					creatorId: creator.id,
				},
			});
			if (
				existingIntervals.some((existingInterval) => {
					const start = DateTime.fromJSDate(
						existingInterval.startTime,
					)
						.toUTC()
						.set({
							year: startDateTime.year,
							month: startDateTime.month,
							day: startDateTime.day,
						})
						.set({
							weekday:
								ModelConverter.weekDay2Index(
									existingInterval.day,
								) + 1,
						});
					const end = DateTime.fromJSDate(existingInterval.startTime)
						.toUTC()
						.set({
							year: startDateTime.year,
							month: startDateTime.month,
							day: startDateTime.day,
						})
						.set({
							weekday:
								ModelConverter.weekDay2Index(
									existingInterval.day,
								) + 1,
						})
						.plus({ minute: existingInterval.length });
					const exitingTimeInterval = Interval.fromDateTimes(
						start,
						end,
					);
					const existingTimeIntervalPlusWeek = Interval.fromDateTimes(
						start.plus({ week: 1 }),
						end.plus({ week: 1 }),
					);
					const existingIntervalMinusWeek = Interval.fromDateTimes(
						start.minus({ week: 1 }),
						end.minus({ week: 1 }),
					);

					return (
						timeInterval.intersection(exitingTimeInterval)
							?.isValid ||
						timeInterval.intersection(existingTimeIntervalPlusWeek)
							?.isValid ||
						timeInterval.intersection(existingIntervalMinusWeek)
							?.isValid
					);
				})
			) {
				return reply.sendError(APIErrors.INTERVAL_CONFLICT);
			}

			const interval = await prisma.meetingInterval.create({
				data: {
					id: snowflake.gen(),
					startTime: startDateTime.toJSDate(),
					creatorId: creator.id,
					day: ModelConverter.index2WeekDay(
						startDateTime.weekday - 1,
					),
					length: request.body.length,
				},
			});

			return reply.send(ModelConverter.toIMeetingInterval(interval));
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

			const intervals = await prisma.meetingInterval.findMany({
				where: {
					creatorId: creator.id,
				},
			});
			return reply.send(intervals.map(ModelConverter.toIMeetingInterval));
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

			const interval = await prisma.meetingInterval.findFirst({
				where: {
					id: BigInt(request.params.id),
					creatorId: creator.id,
				},
			});
			if (!interval) {
				return reply.sendError(APIErrors.INTERVAL_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeetingInterval(interval));
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

			const interval = await prisma.meetingInterval.delete({
				where: {
					id: BigInt(request.params.id),
					creatorId: creator.id,
				},
			});
			if (!interval) {
				return reply.sendError(APIErrors.INTERVAL_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeetingInterval(interval));
		},
	);
}
