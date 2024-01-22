import {
	GetAttendeeCommandOutput,
	GetMeetingCommandOutput,
} from "@aws-sdk/client-chime-sdk-meetings";

export interface CreateMeetingBody {
	hostId: string;
	startDate: string;
	duration: number;
	customerPaymentProfileId?: string;
	topics?: string;
}

export interface AcceptMeetingParams {
	meetingId: string;
}

export type MeetingStatus = "pending" | "accepted" | "declined" | "cancelled";

export type MeetingsQuerySortType = "oldest" | "newest";

export interface MeetingsQuery {
	hostId?: string;
	before?: string;
	after?: string;
	status?: MeetingStatus;
	sort?: MeetingsQuerySortType;
}

export interface GetChimeReply {
	Meeting?: GetMeetingCommandOutput["Meeting"];
	Attendee?: GetAttendeeCommandOutput["Attendee"];
}
