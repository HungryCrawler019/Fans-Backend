import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { ScheduleUpdateReqBody } from "./schemas.js";

export const ScheduleUpdateReqBodyValidator = Type.Object({
	startDate: Type.Optional(Type.String()),
	endDate: Type.Optional(Type.String()),
});

assert<
	Equals<Static<typeof ScheduleUpdateReqBodyValidator>, ScheduleUpdateReqBody>
>();
