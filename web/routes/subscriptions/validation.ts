import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	SubscribeReqBody,
	SubscribeFreeReqBody,
	SubscribePaymentMethodReqBody,
	UnsubscribeReqBody,
	SubscriptionHasAccessReqBody,
	SubscriptionPriceReqQuery,
} from "./schemas.js";

export const SubscriptionPriceReqQueryValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
	bundleId: Type.Optional(Type.String({ format: "snowflake" })),
	customerPaymentProfileId: Type.Optional(Type.String()),
});

assert<
	Equals<
		Static<typeof SubscriptionPriceReqQueryValidator>,
		SubscriptionPriceReqQuery
	>
>();

export const SubscribeReqBodyValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
	bundleId: Type.Optional(Type.String({ format: "snowflake" })),
	customerPaymentProfileId: Type.String({ format: "snowflake" }),
	fanReferralCode: Type.Optional(Type.String()),
});

assert<Equals<Static<typeof SubscribeReqBodyValidator>, SubscribeReqBody>>();

export const SubscribeFreeReqBodyValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});

assert<
	Equals<Static<typeof SubscribeFreeReqBodyValidator>, SubscribeFreeReqBody>
>();

export const SubscribePaymentMethodReqBodyValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
	customerPaymentProfileId: Type.String(),
});

assert<
	Equals<
		Static<typeof SubscribePaymentMethodReqBodyValidator>,
		SubscribePaymentMethodReqBody
	>
>();

export const UnsubscribeReqBodyValidator = Type.Object({
	id: Type.String(),
});

assert<
	Equals<Static<typeof UnsubscribeReqBodyValidator>, UnsubscribeReqBody>
>();

export const SubscriptionHasAccessReqBodyValidator = Type.Object({
	creatorId: Type.Number(),
});

assert<
	Equals<
		Static<typeof SubscriptionHasAccessReqBodyValidator>,
		SubscriptionHasAccessReqBody
	>
>();
