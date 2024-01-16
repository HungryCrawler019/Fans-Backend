import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { CreateMeetingBody, MeetingsQuery } from "./schemas.js";

export const CreateMeetingBodyValidator = Type.Object({
	hostId: Type.String(),
	startDate: Type.String(),
	duration: Type.Integer(),
	paymentToken: Type.Optional(Type.String()),
});
assert<Equals<Static<typeof CreateMeetingBodyValidator>, CreateMeetingBody>>();

export const MeetingQueryValidator = Type.Object({
	hostId: Type.Optional(Type.String()),
	before: Type.Optional(Type.String()),
	after: Type.Optional(Type.String()),
});
assert<Equals<Static<typeof MeetingQueryValidator>, MeetingsQuery>>();
