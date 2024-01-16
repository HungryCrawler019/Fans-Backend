import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { FundraiserUpdateReqBody } from "./schemas.js";

export const FundraiserUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	caption: Type.Optional(Type.String()),
	thumb: Type.Optional(Type.String()),
	price: Type.Optional(Type.Number()),
	currency: Type.Optional(Type.String()),
	endDate: Type.Optional(Type.String()),
	isXpAdd: Type.Optional(Type.Boolean()),
});
assert<
	Equals<
		Static<typeof FundraiserUpdateReqBodyValidator>,
		FundraiserUpdateReqBody
	>
>();
