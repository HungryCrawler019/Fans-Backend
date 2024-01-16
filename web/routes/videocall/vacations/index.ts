import { Logger } from "pino";
import { DateTime, Interval } from "luxon";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import { FastifyTypebox } from "../../../types.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import APIErrors from "../../../errors/index.js";
import { CreateMeetingVacationsBody } from "./schemas.js";
import { CreateMeetingVacationsBodyValidator } from "./validation.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);
	const prisma = await container.resolve(PrismaService);

	fastify.put<{ Body: CreateMeetingVacationsBody }>(
		"/",
		{
			schema: { body: CreateMeetingVacationsBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const vacationIntervals = request.body.vacations.map((vacation) =>
				Interval.fromDateTimes(
					DateTime.fromISO(vacation.startDate),
					DateTime.fromISO(vacation.endDate),
				),
			);
			if (vacationIntervals.some((interval) => !interval.isValid)) {
				return reply.sendError(APIErrors.INVALID_INTERVAL);
			}

			const upcomingMeetings = await prisma.meeting.findMany({
				where: {
					hostId: creator.id,
					startDate: { gte: new Date() },
				},
			});
			const conflictingMeetings = upcomingMeetings.filter((meeting) => {
				const meetingInterval = Interval.fromDateTimes(
					DateTime.fromJSDate(meeting.startDate),
					DateTime.fromJSDate(meeting.endDate),
				);

				return vacationIntervals.some(
					(vacationInterval) =>
						vacationInterval.intersection(meetingInterval)?.isValid,
				);
			});

			const vacationsData = vacationIntervals.map((interval) => ({
				id: snowflake.gen(),
				startDate: interval.start!.toUTC().toJSDate(),
				endDate: interval.end!.toUTC().toJSDate(),
				creatorId: creator.id,
			}));

			await prisma.$transaction([
				prisma.meetingVacation.deleteMany({
					where: { creatorId: creator.id },
				}),
				prisma.meetingVacation.createMany({
					data: vacationsData,
				}),
			]);

			return reply.send({
				vacations: vacationsData.map(ModelConverter.toIMeetingVacation),
				conflictingMeetings: conflictingMeetings.map(
					ModelConverter.toIMeeting,
				),
			});
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

			const vacations = await prisma.meetingVacation.findMany({
				where: { creatorId: creator.id },
			});

			return reply.send(vacations.map(ModelConverter.toIMeetingVacation));
		},
	);
}
