import {
	AttendeeCapabilities,
	ChimeSDKMeetingsClient,
	CreateAttendeeCommand,
	CreateMeetingCommand,
	DeleteMeetingCommand,
	GetAttendeeCommand,
	GetMeetingCommand,
} from "@aws-sdk/client-chime-sdk-meetings"; // ES Modules import
import { Injectable } from "async-injection";

@Injectable()
export class ChimeService {
	private readonly region: string;
	private readonly client: ChimeSDKMeetingsClient;

	constructor(
		region: string,
		{
			accessKeyId,
			secretAccessKey,
		}: { accessKeyId: string; secretAccessKey: string },
	) {
		this.region = region;
		this.client = new ChimeSDKMeetingsClient({
			region: process.env.CHIME_REGION,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}

	async createMeeting(externalMeetingId: string, requestToken: string) {
		const command = new CreateMeetingCommand({
			ClientRequestToken: requestToken,
			MediaRegion: this.region,
			ExternalMeetingId: externalMeetingId,
		});
		return this.client.send(command);
	}

	async createAttendee(
		meetingId: string,
		userId: string,
		capabilities: AttendeeCapabilities,
	) {
		const command = new CreateAttendeeCommand({
			MeetingId: meetingId,
			ExternalUserId: userId,
			Capabilities: capabilities,
		});
		return this.client.send(command);
	}

	async deleteMeeting(chimeMeetingId: string) {
		const command = new DeleteMeetingCommand({
			MeetingId: chimeMeetingId,
		});
		return this.client.send(command);
	}

	async getMeeting(chimeMeetingId: string) {
		const command = new GetMeetingCommand({
			MeetingId: chimeMeetingId,
		});
		return this.client.send(command);
	}

	async getAttendee(meetingId: string, attendeeId: string) {
		const command = new GetAttendeeCommand({
			MeetingId: meetingId,
			AttendeeId: attendeeId,
		});
		return this.client.send(command);
	}
}

export const chimeFactory = async (): Promise<ChimeService> => {
	const accessKeyId = process.env.CHIME_ACCESS_KEY_ID;
	const secretAccessKey = process.env.CHIME_SECRET_ACCESS_KEY;
	const region = process.env.CHIME_REGION;

	if (!region) {
		throw new Error("CHIME_REGION is not set");
	}
	if (!accessKeyId) {
		throw new Error("CHIME_ACCESS_KEY_ID is not set");
	}
	if (!secretAccessKey) {
		throw new Error("CHIME_SECRET_ACCESS_KEY is not set");
	}

	return new ChimeService(region, { accessKeyId, secretAccessKey });
};
