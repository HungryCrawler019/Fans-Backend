import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { TierCreateReqBody, TierUpdateReqBody } from "./schemas.js";

export const TierCreateReqBodyValidator = Type.Object({
	title: Type.String(),
	price: Type.Number(),
	currency: Type.String(),
	description: Type.String(),
	cover: Type.String(),
	perks: Type.Array(Type.String()),
});

assert<Equals<Static<typeof TierCreateReqBodyValidator>, TierCreateReqBody>>();

export const TierUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	price: Type.Optional(Type.Number()),
	currency: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	cover: Type.Optional(Type.String()),
	perks: Type.Optional(Type.Array(Type.String())),
});

assert<Equals<Static<typeof TierUpdateReqBodyValidator>, TierUpdateReqBody>>();
