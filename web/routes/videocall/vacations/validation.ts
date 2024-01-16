import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { CreateMeetingVacationsBody } from "./schemas.js";

const VacationValidator = Type.Object({
	startDate: Type.String(),
	endDate: Type.String(),
});

export const CreateMeetingVacationsBodyValidator = Type.Object({
	vacations: Type.Array(VacationValidator),
});
assert<
	Equals<
		Static<typeof CreateMeetingVacationsBodyValidator>,
		CreateMeetingVacationsBody
	>
>();
