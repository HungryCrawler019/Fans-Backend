import { Logger } from "pino";
import { DateTime, Interval } from "luxon";
import {
	DEFAULT_PAGE_SIZE,
	PaginatedQuery,
} from "../../../../common/pagination.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { FastifyTypebox } from "../../../types.js";
import { CreateMeetingBody, GetChimeReply, MeetingsQuery } from "./schemas.js";
import {
	CreateMeetingBodyValidator,
	MeetingQueryValidator,
} from "./validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { IMeeting } from "../../../CommonAPISchemas.js";
import APIErrors from "../../../errors/index.js";
import { MeetingService } from "../../../../common/service/MeetingService.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);
	const meetingService = await container.resolve(MeetingService);

	fastify.post<{ Body: CreateMeetingBody }>(
		"/",
		{
			schema: { body: CreateMeetingBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;

			if (
				request.body.paymentToken !==
				process.env.VIDEOCALL_BYPASS_PAYMENT_TOKEN
			) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			const creator = await prisma.profile.findFirst({
				where: { id: BigInt(request.body.hostId) },
			});
			if (!creator || creator.userId === BigInt(session.userId)) {
				return reply.sendError(
					APIErrors.INVALID_MEETING_HOST(request.body.hostId),
				);
			}

			// Validate duration
			const durations = await prisma.meetingDuration.findMany({
				where: {
					creatorId: creator.id,
					length: request.body.duration,
					isEnabled: true,
				},
			});
			if (!durations.length) {
				return reply.sendError(APIErrors.INVALID_DURATION);
			}

			// Validate start date
			const startTime = DateTime.fromISO(request.body.startDate);
			const fromNowInterval = Interval.fromDateTimes(
				DateTime.now(),
				startTime,
			);
			if (
				!fromNowInterval.isValid ||
				fromNowInterval.length("week") > 4
			) {
				return reply.sendError(APIErrors.INVALID_MEETING_DATE);
			}
			const meetingTimeInterval = Interval.fromDateTimes(
				startTime,
				startTime.plus({ minute: request.body.duration }),
			);
			if (!meetingTimeInterval.isValid) {
				return reply.sendError(APIErrors.INVALID_INTERVAL);
			}

			// Check meeting conflicts
			const existingMeetings = await prisma.meeting.findMany({
				where: {
					hostId: creator.id,
					startDate: { gte: startTime.toJSDate() },
				},
			});
			if (
				existingMeetings.some((existingMeeting) => {
					const existingMeetingInterval = Interval.fromDateTimes(
						DateTime.fromJSDate(existingMeeting.startDate),
						DateTime.fromJSDate(existingMeeting.endDate),
					);
					return existingMeetingInterval.intersection(
						meetingTimeInterval,
					)?.isValid;
				})
			) {
				return reply.sendError(APIErrors.MEETING_CONFLICT);
			}

			// Check if meeting fits into creators time intervals
			const intervals = await prisma.meetingInterval.findMany({
				where: { creatorId: creator.id },
			});
			if (
				!intervals.some((interval) => {
					const intervalStartTime = DateTime.fromJSDate(
						interval.startTime,
					)
						.set({
							year: startTime.year,
							month: startTime.month,
							day: startTime.day,
						})
						.set({
							weekday:
								ModelConverter.weekDay2Index(interval.day) + 1,
						});
					const intervalEndTime = intervalStartTime.plus({
						minute: interval.length,
					});
					const timeInterval = Interval.fromDateTimes(
						intervalStartTime,
						intervalEndTime,
					);

					return (
						timeInterval.contains(
							meetingTimeInterval.start as DateTime,
						) &&
						timeInterval.contains(
							meetingTimeInterval.end as DateTime,
						)
					);
				})
			) {
				return reply.sendError(APIErrors.MEETING_SCHEDULE_MISMATCH);
			}

			// Create meeting
			const meeting = await meetingService.create({
				host: creator,
				userId: BigInt(session.userId),
				startDate: meetingTimeInterval.start?.toUTC()?.toJSDate(),
				endDate: meetingTimeInterval.end?.toUTC()?.toJSDate(),
			});
			return reply.status(200).send(ModelConverter.toIMeeting(meeting));
		},
	);

	fastify.get<{
		Querystring: PaginatedQuery<MeetingsQuery>;
		Reply: IMeeting[];
	}>(
		"/",
		{
			schema: {
				querystring: MeetingQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const {
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				hostId,
				before,
				after,
			} = request.query;

			const session = request.session!;
			const meetings = await prisma.meeting.findMany({
				where: {
					...(hostId ? { hostId: BigInt(hostId) } : {}),
					users: {
						some: {
							userId: BigInt(session.userId),
						},
					},
					startDate: {
						lte: before
							? new Date(before)
							: DateTime.utc().plus({ years: 1 }).toJSDate(),
						gte: after
							? new Date(after)
							: DateTime.utc().minus({ years: 1 }).toJSDate(),
					},
				},
				orderBy: { startDate: "asc" },
				take: size,
				skip: (page - 1) * size,
			});

			return reply.send(meetings.map(ModelConverter.toIMeeting));
		},
	);

	fastify.get<{
		Querystring: MeetingsQuery;
		Params: IdParams;
		Reply: IMeeting;
	}>(
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

			const meetingUser = await prisma.meetingUser.findFirst({
				where: {
					userId: BigInt(session.userId),
					meetingId: BigInt(request.params.id),
				},
			});
			if (!meetingUser) {
				// only meeting attendants can query meeting
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			const meeting = await meetingService.getById(
				BigInt(request.params.id),
			);
			if (!meeting) {
				return reply.sendError(APIErrors.MEETING_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeeting(meeting));
		},
	);

	fastify.get<{
		Querystring: MeetingsQuery;
		Params: IdParams;
		Reply: GetChimeReply;
	}>(
		"/:id/session-configuration",
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

			const meetingUser = await prisma.meetingUser.findFirst({
				where: {
					userId: BigInt(session.userId),
					meetingId: BigInt(request.params.id),
				},
				include: {
					meeting: true,
				},
			});
			if (!meetingUser) {
				// only meeting attendants can query meeting
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			const meeting = await meetingService.getChimeMeeting(
				meetingUser.meeting,
			);
			const attendee = await meetingService.getChimeAttendee(
				meetingUser.meeting,
				meetingUser,
			);

			return reply.send({
				Meeting: meeting?.Meeting,
				Attendee: attendee?.Attendee,
			});
		},
	);
}
