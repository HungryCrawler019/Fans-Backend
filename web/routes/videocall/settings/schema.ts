import { MeetingContentType, MeetingType } from "@prisma/client";

export interface VideoCallSettings {
	bufferBetweenCalls: number;
	meetingType: MeetingType;
	sexualContentAllowed: boolean;
	contentPreferences: (typeof MeetingContentType)[keyof typeof MeetingContentType][];
	customContentPreferences?: string;
	meetingTitle?: string;
	meetingDescription?: string;
	notificationNewRequests: boolean;
	notificationCancellations: boolean;
	notificationReminders: boolean;
	notificationsByEmail: boolean;
	notificationsByPhone: boolean;
	videoCallsEnabled?: boolean;
}

export type UpdateVideoCallSettings = Partial<VideoCallSettings>;
