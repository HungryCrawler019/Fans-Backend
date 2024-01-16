import { Static, Type } from "@sinclair/typebox";
import { Equals, assert } from "tsafe";
import {
	ExplicitCommentFilterReqBody,
	HideCommentsReqBody,
	HideLikesReqBody,
	HideTipsReqBody,
	LimitFuturePaymentParams,
	ReferralSetupReqBody,
	ShowProfileReqBody,
	WatermarkReqBody,
} from "./schemas.js";

export const ExplicitCommentFilterReqBodyValidator = Type.Object({
	explicitCommentFilter: Type.Boolean(),
});
assert<
	Equals<
		Static<typeof ExplicitCommentFilterReqBodyValidator>,
		ExplicitCommentFilterReqBody
	>
>();

export const HideCommentsReqBodyValidator = Type.Object({
	hideComments: Type.Boolean(),
});
assert<
	Equals<Static<typeof HideCommentsReqBodyValidator>, HideCommentsReqBody>
>();

export const HideLikesReqBodyValidator = Type.Object({
	hideLikes: Type.Boolean(),
});
assert<Equals<Static<typeof HideLikesReqBodyValidator>, HideLikesReqBody>>();

export const HideTipsReqBodyValidator = Type.Object({
	hideTips: Type.Boolean(),
});
assert<Equals<Static<typeof HideTipsReqBodyValidator>, HideTipsReqBody>>();

export const ShowProfileReqBodyValidator = Type.Object({
	showProfile: Type.Boolean(),
});
assert<
	Equals<Static<typeof ShowProfileReqBodyValidator>, ShowProfileReqBody>
>();

export const WatermarkReqBodyValidator = Type.Object({
	watermark: Type.Boolean(),
});
assert<Equals<Static<typeof WatermarkReqBodyValidator>, WatermarkReqBody>>();

export const LimitFuturePaymentParamsValidator = Type.Object({
	creatorId: Type.String({ format: "snowflake" }),
	userId: Type.String({ format: "snowflake" }),
});
assert<
	Equals<
		Static<typeof LimitFuturePaymentParamsValidator>,
		LimitFuturePaymentParams
	>
>();

export const ReferralSetupReqBodyValidator = Type.Object({
	isFanReferralEnabled: Type.Boolean(),
	fanReferralShare: Type.Number(),
	marketingContentLink: Type.Optional(Type.String()),
});
assert<
	Equals<Static<typeof ReferralSetupReqBodyValidator>, ReferralSetupReqBody>
>();
