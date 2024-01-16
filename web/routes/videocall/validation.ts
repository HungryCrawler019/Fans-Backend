import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { GetAvailabilityQuery } from "./schemas.js";

export const GetAvailabilityQueryValidator = Type.Object({
	creatorId: Type.String(),
	before: Type.String(),
	after: Type.String(),
	duration: Type.Integer({ multipleOf: 15 }),
});
assert<
	Equals<Static<typeof GetAvailabilityQueryValidator>, GetAvailabilityQuery>
>();
