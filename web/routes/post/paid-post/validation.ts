import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	PaidPostUpdateReqBody,
	PurchasePaidPostReqBody,
	PaidPostPriceReqQuery,
	PaidPostSortTypeEnum,
	PaidPostQuery,
} from "./schemas.js";

export const PaidPostUpdateReqBodyValidator = Type.Object({
	price: Type.Optional(Type.Number()),
	currency: Type.Optional(Type.String()),
	thumb: Type.Optional(Type.String()),
});

assert<
	Equals<Static<typeof PaidPostUpdateReqBodyValidator>, PaidPostUpdateReqBody>
>();

export const PurchasePaidPostReqBodyValidator = Type.Object({
	postId: Type.String(),
	customerPaymentProfileId: Type.String(),
	fanReferralCode: Type.Optional(Type.String()),
});

assert<
	Equals<
		Static<typeof PurchasePaidPostReqBodyValidator>,
		PurchasePaidPostReqBody
	>
>();

export const PaidPostPriceReqQueryValidator = Type.Object({
	id: Type.String(),
	customerPaymentProfileId: Type.Optional(Type.String()),
});

assert<
	Equals<Static<typeof PaidPostPriceReqQueryValidator>, PaidPostPriceReqQuery>
>();

export const PaidPostQueryValidator = Type.Object({
	sort: Type.Optional(Type.Enum(PaidPostSortTypeEnum)),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});
assert<Equals<Static<typeof PaidPostQueryValidator>, PaidPostQuery>>();
