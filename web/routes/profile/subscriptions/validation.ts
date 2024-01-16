import { CampaignType, DurationType, PromotionType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	SubscriptionCreateReqBody,
	SubscriptionUpdateReqBody,
} from "./schemas.js";

export const SubscriptionCreateReqBodyValidator = Type.Object({
	title: Type.String(),
	currency: Type.String(),
	price: Type.Number(),
	campaigns: Type.Optional(
		Type.Array(
			Type.Object({
				duration: Type.Optional(Type.Number()),
				durationType: Type.Optional(Type.Enum(DurationType)),
				endDate: Type.Optional(Type.String()),
				limit: Type.Optional(Type.Number()),
				discount: Type.Optional(Type.Number()),
				type: Type.Enum(PromotionType),
				applicable: Type.Enum(CampaignType),
				roles: Type.Optional(Type.Array(Type.String())),
			}),
		),
	),
	bundles: Type.Optional(
		Type.Array(
			Type.Object({
				title: Type.Optional(Type.String()),
				month: Type.Number(),
				discount: Type.Number(),
				limit: Type.Optional(Type.Number()),
				roles: Type.Optional(Type.Array(Type.String())),
			}),
		),
	),
});

assert<
	Equals<
		Static<typeof SubscriptionCreateReqBodyValidator>,
		SubscriptionCreateReqBody
	>
>();

export const SubscriptionUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	currency: Type.Optional(Type.String()),
	price: Type.Optional(Type.Number()),
});

assert<
	Equals<
		Static<typeof SubscriptionUpdateReqBodyValidator>,
		SubscriptionUpdateReqBody
	>
>();
