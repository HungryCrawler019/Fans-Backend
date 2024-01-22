import { Inject, Injectable } from "async-injection";
import {
	Meeting,
	MeetingType,
	MeetingUser,
	Profile,
	RtcStreamCapability,
} from "@prisma/client";
import { DateTime, Interval } from "luxon";
import { Logger } from "pino";
import { v4 as uuidv4 } from "uuid";
import PrismaService from "./PrismaService.js";
import BullMQService from "./BullMQService.js";
import SnowflakeService from "./SnowflakeService.js";
import { ChimeService } from "./ChimeService.js";

@Injectable()
export class MeetingService {
	constructor(
		private prisma: PrismaService,
		private bullMQService: BullMQService,
		private snowflake: SnowflakeService,
		private chime: ChimeService,
		@Inject("logger") private logger: Logger,
	) {}

	async getById(id: bigint) {
		return this.prisma.meeting.findFirst({
			where: { id },
		});
	}

	async create({
		host,
		userId,
		startDate = DateTime.utc().toJSDate(),
		endDate = DateTime.utc().plus({ hours: 1 }).toJSDate(),
		topics,
	}: {
		host: Profile;
		userId: bigint;
		startDate?: Date;
		endDate?: Date;
		topics?: string;
	}) {
		const meeting = await this.prisma.meeting.create({
			data: {
				id: this.snowflake.gen(),
				hostId: host.id,
				startDate,
				endDate,
				chimeRequestToken: uuidv4(),
				topics,
			},
		});
		const settings = await this.prisma.meetingSettings.findFirst({
			where: { profileId: host.id },
		});
		if (!settings) {
			throw new Error("Meeting settings not found");
		}

		await this.prisma.meetingUser.createMany({
			data: [
				{
					userId,
					meetingId: meeting.id,
					audioStreamCapability: RtcStreamCapability.SendReceive,
					videoStreamCapability:
						settings.meetingType === MeetingType.OneOnOne_TwoWay
							? RtcStreamCapability.SendReceive
							: RtcStreamCapability.Receive,
					contentStreamCapability: RtcStreamCapability.SendReceive,
				},
				{
					userId: host.userId,
					meetingId: meeting.id,
					audioStreamCapability: RtcStreamCapability.SendReceive,
					videoStreamCapability: RtcStreamCapability.SendReceive,
					contentStreamCapability: RtcStreamCapability.SendReceive,
				},
			],
		});

		await this.schedulePrepareRoom(
			meeting.id,
			DateTime.fromJSDate(meeting.startDate)
				.minus({ minute: 5 })
				.toJSDate(),
		);
		await this.scheduleCleanRoom(
			meeting.id,
			DateTime.fromJSDate(meeting.endDate).plus({ minute: 5 }).toJSDate(),
		);
		return meeting;
	}

	async getChimeMeeting(meeting: Meeting) {
		if (!meeting.chimeMeetingId) {
			return undefined;
		}
		return this.chime.getMeeting(meeting.chimeMeetingId);
	}

	async getChimeAttendee(meeting: Meeting, user: MeetingUser) {
		if (!meeting.chimeMeetingId || !user.attendeeId) {
			return undefined;
		}
		return this.chime.getAttendee(meeting.chimeMeetingId, user.attendeeId);
	}

	async prepareRoom(meetingId: bigint) {
		this.logger.info(`Preparing room before meeting: ${meetingId}...`);

		const meeting = await this.getById(meetingId);
		if (!meeting) {
			this.logger.warn(`No meeting with id ${meetingId} found`);
			return;
		}

		const chimeMeeting = await this.chime.createMeeting(
			String(meetingId),
			meeting.chimeRequestToken,
		);
		this.logger.debug(chimeMeeting, "Created chime meeting");
		await this.prisma.meeting.update({
			where: { id: meetingId },
			data: { chimeMeetingId: chimeMeeting.Meeting?.MeetingId },
		});

		const chimeMeetingId = chimeMeeting.Meeting?.MeetingId;
		if (!chimeMeetingId) {
			this.logger.error(
				"Failed to create Chime meeting: missing MeetingId",
			);
			return;
		}

		const participants = await this.prisma.meetingUser.findMany({
			where: { meetingId },
		});
		await Promise.all(
			participants.map(async (participant) => {
				const attendee = await this.chime.createAttendee(
					chimeMeetingId,
					String(participant.userId),
					{
						Audio: participant.audioStreamCapability,
						Video: participant.videoStreamCapability,
						Content: participant.contentStreamCapability,
					},
				);
				this.logger.debug(attendee, "Created chime attendee");

				await this.prisma.meetingUser.update({
					where: {
						meetingId_userId: {
							meetingId,
							userId: participant.userId,
						},
					},
					data: {
						joinToken: attendee.Attendee?.JoinToken,
						attendeeId: attendee.Attendee?.AttendeeId,
					},
				});
			}),
		);
	}

	async cleanRoom(meetingId: bigint) {
		this.logger.info(`Cleaning room after meeting: ${meetingId}...`);

		const meeting = await this.getById(meetingId);
		if (!meeting || !meeting.chimeMeetingId) return;

		await this.chime.deleteMeeting(meeting.chimeMeetingId);
	}

	private async schedulePrepareRoom(meetingId: bigint, date: Date) {
		const interval = Interval.fromDateTimes(
			DateTime.now(),
			DateTime.fromJSDate(date),
		);
		const queue = this.bullMQService.createQueue("Meeting");
		const job = await queue.add(
			"prepareRoom",
			{ meetingId },
			{ delay: interval.length("milliseconds") || 0 },
		);

		await this.prisma.meeting.update({
			where: { id: meetingId },
			data: { prepareJobId: job.id },
		});
	}

	private async scheduleCleanRoom(meetingId: bigint, date: Date) {
		const interval = Interval.fromDateTimes(
			DateTime.now(),
			DateTime.fromJSDate(date),
		);
		const queue = this.bullMQService.createQueue("Meeting");
		const job = await queue.add(
			"cleanRoom",
			{ meetingId },
			{ delay: interval.length("milliseconds") || 0 },
		);

		await this.prisma.meeting.update({
			where: { id: meetingId },
			data: { cleanJobId: job.id },
		});
	}
}
