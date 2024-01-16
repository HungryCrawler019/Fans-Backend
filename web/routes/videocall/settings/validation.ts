import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { MeetingContentType, MeetingType } from "@prisma/client";
import { UpdateVideoCallSettings } from "./schema.js";

export const UpdateVideoCallSettingsValidator = Type.Object({
	bufferBetweenCalls: Type.Optional(
		Type.Integer({ multipleOf: 5, minimum: 5, maximum: 60 }),
	),
	meetingType: Type.Optional(Type.Enum(MeetingType)),
	sexualContentAllowed: Type.Optional(Type.Boolean()),
	contentPreferences: Type.Optional(
		Type.Array(
			Type.Union([
				Type.Literal(MeetingContentType.Advice),
				Type.Literal(MeetingContentType.Consultation),
				Type.Literal(MeetingContentType.Performance),
				Type.Literal(MeetingContentType.EighteenPlusAdult),
				Type.Literal(MeetingContentType.EighteenPlusSexual),
				Type.Literal(MeetingContentType.Spirituality),
			]),
			{ uniqueItems: true },
		),
	),
	customContentPreferences: Type.Optional(Type.String()),
	meetingTitle: Type.Optional(Type.String()),
	meetingDescription: Type.Optional(Type.String()),
	notificationNewRequests: Type.Optional(Type.Boolean()),
	notificationCancellations: Type.Optional(Type.Boolean()),
	notificationReminders: Type.Optional(Type.Boolean()),
	notificationsByEmail: Type.Optional(Type.Boolean()),
	notificationsByPhone: Type.Optional(Type.Boolean()),
	videoCallsEnabled: Type.Optional(Type.Boolean()),
});
assert<
	Equals<
		Static<typeof UpdateVideoCallSettingsValidator>,
		UpdateVideoCallSettings
	>
>();
