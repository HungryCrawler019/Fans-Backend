import { Logger } from "pino";
import { DateTime, Interval } from "luxon";
import { MeetingInterval, MeetingStatus } from "@prisma/client";
import { FastifyTypebox } from "../../types.js";
import SessionManagerService, {
	Session,
} from "../../../common/service/SessionManagerService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { IdParams } from "../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../common/validators/validation.js";
import { GetAvailabilityQueryValidator } from "./validation.js";
import {
	AvailabilityInterval,
	GetAvailabilityQuery,
	GetAvailabilityReply,
	VideoCallProfile,
} from "./schemas.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);

	fastify.get<{
		Querystring: GetAvailabilityQuery;
		Reply: GetAvailabilityReply;
	}>(
		"/availability",
		{
			schema: { querystring: GetAvailabilityQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const creator = await prisma.profile.findFirst({
				where: { id: BigInt(request.query.creatorId) },
			});
			if (!creator) {
				return reply.sendError(
					APIErrors.INVALID_MEETING_HOST(request.query.creatorId),
				);
			}

			const timeInterval = Interval.fromDateTimes(
				DateTime.fromISO(request.query.after),
				DateTime.fromISO(request.query.before),
			);
			if (!timeInterval.isValid) {
				return reply.sendError(APIErrors.INVALID_INTERVAL);
			}
			if (timeInterval.length("days") > 7) {
				return reply.sendError(APIErrors.INVALID_INTERVAL);
			}
			if (timeInterval.end! < DateTime.now()) {
				return reply.send({ intervals: [] });
			}

			const durations = await prisma.meetingDuration.findMany({
				where: {
					creatorId: creator.id,
					length: request.query.duration,
				},
			});
			if (!durations.length) {
				return reply.send({ intervals: [] });
			}

			const intervals = await prisma.meetingInterval.findMany({
				where: { creatorId: creator.id },
			});

			let responseIntervalsStart: DateTime[] = [];
			const pushResponseIntervals = (
				interval: MeetingInterval,
				start: DateTime,
			) => {
				if (timeInterval.contains(start)) {
					const numberOfIntervals =
						interval.length / request.query.duration;
					for (let i = 0; i < numberOfIntervals; i += 1) {
						const rsIntervalStart = start.plus({
							minute: i * request.query.duration,
						});
						if (timeInterval.contains(rsIntervalStart)) {
							responseIntervalsStart.push(rsIntervalStart);
						}
					}
				}
			};

			intervals.forEach((interval) => {
				const timeIntervalStart = timeInterval.start as DateTime;
				const start = DateTime.fromJSDate(interval.startTime)
					.set({
						year: timeIntervalStart.year,
						month: timeIntervalStart.month,
						day: timeIntervalStart.day,
					})
					.set({
						weekday: ModelConverter.weekDay2Index(interval.day) + 1,
					});
				const nextWeekStart = start.plus({ day: 7 });

				pushResponseIntervals(interval, start);
				// `timeInterval` may cover current and next weeks
				pushResponseIntervals(interval, nextWeekStart);
			});

			// filter past intervals
			responseIntervalsStart = responseIntervalsStart.filter(
				(date) => date > DateTime.now(),
			);

			// Filter out already booked intervals
			const existingMeetings = await prisma.meeting.findMany({
				where: {
					hostId: creator.id,
					startDate: {
						gte: timeInterval.start?.toJSDate(),
						lte: timeInterval.end?.toJSDate(),
					},
					AND: [
						{
							status: { not: MeetingStatus.Cancelled },
						},
						{
							status: { not: MeetingStatus.Declined },
						},
					],
				},
			});
			const settings = await prisma.meetingSettings.findFirst({
				where: { profileId: creator.id },
			});
			if (!settings) {
				return reply.sendError(APIErrors.MEETING_SETTINGS_NOT_FOUND);
			}
			existingMeetings.forEach((meeting) => {
				const meetingTimeInterval = Interval.fromDateTimes(
					DateTime.fromJSDate(meeting.startDate).minus({
						minute: settings.bufferBetweenCalls,
					}),
					DateTime.fromJSDate(meeting.endDate).plus({
						minute: settings.bufferBetweenCalls,
					}),
				);

				responseIntervalsStart = responseIntervalsStart.filter(
					(date) => {
						const rsTimeInterval = Interval.after(date, {
							minute: request.query.duration,
						});

						return !meetingTimeInterval.intersection(rsTimeInterval)
							?.isValid;
					},
				);
			});

			// Check vacations
			const vacations = await prisma.meetingVacation.findMany({
				where: { creatorId: creator.id },
			});
			vacations.forEach((vacation) => {
				const vacationInterval = Interval.fromDateTimes(
					DateTime.fromJSDate(vacation.startDate),
					DateTime.fromJSDate(vacation.endDate),
				);

				responseIntervalsStart = responseIntervalsStart.filter(
					(date) => {
						const rsTimeInterval = Interval.after(date, {
							minute: request.query.duration,
						});

						return !vacationInterval.intersection(rsTimeInterval)
							?.isValid;
					},
				);
			});

			responseIntervalsStart.sort();

			return reply.send({
				intervals: responseIntervalsStart.map((date) => ({
					duration: request.query.duration,
					startDate: date.toUTC().toISO() || "",
				})),
			});
		},
	);

	fastify.get<{
		Reply: VideoCallProfile;
		Params: IdParams;
	}>(
		"/profiles/:id",
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
			const settings = await prisma.meetingSettings.findFirst({
				where: { profileId: BigInt(request.params.id) },
			});
			if (!settings) {
				return reply.sendError(APIErrors.MEETING_SETTINGS_NOT_FOUND);
			}
			const durations = await prisma.meetingDuration.findMany({
				where: {
					creatorId: BigInt(request.params.id),
					isEnabled: true,
				},
			});
			const intervals = await prisma.meetingInterval.findMany({
				where: {
					creatorId: BigInt(request.params.id),
				},
			});
			const meetingDurations = durations
				.map(ModelConverter.toIMeetingDuration)
				.map(({ id, isEnabled, ...duration }) => duration);
			const isAvailable =
				settings.videoCallsEnabled &&
				!!durations.length &&
				!!intervals.length;

			return reply.send({
				bufferBetweenCalls: settings.bufferBetweenCalls,
				meetingType: settings.meetingType,
				sexualContentAllowed: settings.sexualContentAllowed,
				contentPreferences: settings.contentPreferences,
				customContentPreferences:
					settings.customContentPreferences || "",
				meetingTitle: settings.title || "",
				meetingDescription: settings.description || "",
				meetingDurations,
				isAvailable,
			});
		},
	);
}
