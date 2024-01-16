import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { GiveawayUpdateReqBody } from "./schemas.js";

export const GiveawayUpdateReqBodyValidator = Type.Object({
	prize: Type.Optional(Type.String()),
	thumb: Type.Optional(Type.String()),
	endDate: Type.Optional(Type.String()),
	winnerCount: Type.Optional(Type.Number()),
	roles: Type.Optional(Type.Array(Type.String())),
});
assert<
	Equals<Static<typeof GiveawayUpdateReqBodyValidator>, GiveawayUpdateReqBody>
>();
