import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	EarningsReqBody,
	RefundReqBody,
	PaidPostEarningsReqBody,
	PaidPostPurchased,
} from "./schemas.js";

export const EarningsReqBodyValidator = Type.Object({
	startDate: Type.Optional(Type.String()),
	endDate: Type.Optional(Type.String()),
});

assert<Equals<Static<typeof EarningsReqBodyValidator>, EarningsReqBody>>();

export const RefundReqBodyValidator = Type.Object({
	id: Type.String(),
});

assert<Equals<Static<typeof RefundReqBodyValidator>, RefundReqBody>>();

export const PaidPostEarningsReqBodyValidator = Type.Object({
	postId: Type.String(),
	startDate: Type.Optional(Type.String()),
	endDate: Type.Optional(Type.String()),
});

assert<
	Equals<
		Static<typeof PaidPostEarningsReqBodyValidator>,
		PaidPostEarningsReqBody
	>
>();

export const PaidPostPurchasedValidator = Type.Object({
	postId: Type.String(),
});

assert<Equals<Static<typeof PaidPostPurchasedValidator>, PaidPostPurchased>>();
