import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { CreateMeetingIntervalBody } from "./schemas.js";

export const CreateMeetingIntervalBodyValidator = Type.Object({
	startTime: Type.String(),
	length: Type.Integer({ minimum: 5, maximum: 24 * 60 }),
	day: Type.Integer({ minimum: 0, maximum: 6 }),
});
assert<
	Equals<
		Static<typeof CreateMeetingIntervalBodyValidator>,
		CreateMeetingIntervalBody
	>
>();
