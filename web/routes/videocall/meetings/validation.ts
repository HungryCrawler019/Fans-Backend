import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	CreateMeetingBody,
	AcceptMeetingParams,
	MeetingsQuery,
} from "./schemas.js";

export const CreateMeetingBodyValidator = Type.Object({
	hostId: Type.String(),
	startDate: Type.String(),
	duration: Type.Integer(),
	customerPaymentProfileId: Type.Optional(Type.String()),
	topics: Type.Optional(Type.String()),
});
assert<Equals<Static<typeof CreateMeetingBodyValidator>, CreateMeetingBody>>();

export const AcceptMeetingParamsValidator = Type.Object({
	meetingId: Type.String(),
});

assert<
	Equals<Static<typeof AcceptMeetingParamsValidator>, AcceptMeetingParams>
>();

export const MeetingQueryValidator = Type.Object({
	hostId: Type.Optional(Type.String()),
	before: Type.Optional(Type.String()),
	after: Type.Optional(Type.String()),
	status: Type.Optional(
		Type.Union([
			Type.Literal("pending"),
			Type.Literal("accepted"),
			Type.Literal("cancelled"),
			Type.Literal("declined"),
		]),
	),
	sort: Type.Optional(
		Type.Union([Type.Literal("oldest"), Type.Literal("newest")]),
	),
});
assert<Equals<Static<typeof MeetingQueryValidator>, MeetingsQuery>>();
