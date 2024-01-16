import {
	GetAttendeeCommandOutput,
	GetMeetingCommandOutput,
} from "@aws-sdk/client-chime-sdk-meetings";

export interface CreateMeetingBody {
	hostId: string;
	startDate: string;
	duration: number;
	paymentToken?: string;
}

export interface MeetingsQuery {
	hostId?: string;
	before?: string;
	after?: string;
}

export interface GetChimeReply {
	Meeting?: GetMeetingCommandOutput["Meeting"];
	Attendee?: GetAttendeeCommandOutput["Attendee"];
}
