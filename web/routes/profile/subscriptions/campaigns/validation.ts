import { CampaignType, DurationType, PromotionType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { CampaignCreateBody, CampaignUpdateBody } from "./schemas.js";

export const CampaignCreateBodyValidator = Type.Object({
	duration: Type.Optional(Type.Number()),
	durationType: Type.Optional(Type.Enum(DurationType)),
	endDate: Type.Optional(Type.String()),
	limit: Type.Optional(Type.Number()),
	discount: Type.Optional(Type.Number()),
	type: Type.Enum(PromotionType),
	applicable: Type.Enum(CampaignType),
	roles: Type.Optional(Type.Array(Type.String())),
});

assert<
	Equals<Static<typeof CampaignCreateBodyValidator>, CampaignCreateBody>
>();

export const CampaignUpdateBodyValidator = Type.Object({
	duration: Type.Optional(Type.Number()),
	durationType: Type.Optional(Type.Enum(DurationType)),
	endDate: Type.Optional(Type.String()),
	limit: Type.Optional(Type.Number()),
	discount: Type.Optional(Type.Number()),
	type: Type.Optional(Type.Enum(PromotionType)),
	applicable: Type.Optional(Type.Enum(CampaignType)),
});

assert<
	Equals<Static<typeof CampaignUpdateBodyValidator>, CampaignUpdateBody>
>();
