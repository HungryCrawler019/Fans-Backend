import { SubscriptionType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { Equals, assert } from "tsafe";
import {
	AgeVerifyOndatoWebhookReqBody,
	AvatarCreateReqBody,
	PreviewCreateReqBody,
	ProfileCreateReqBody,
	ProfileFilterQuery,
	ProfileLinkReqBody,
	ProfileMigrationReqBody,
	ProfileUpdateReqBody,
	SocialLinkReqBody,
} from "./schemas.js";

export const ProfileReqBodyValidator = Type.Object({
	displayName: Type.Optional(Type.String()),
	bio: Type.String(),
	cover: Type.Array(Type.String()),
	isNSFW: Type.Boolean(),
	subscriptionType: Type.Enum(SubscriptionType),
	migrationLink: Type.Optional(Type.String()),
	location: Type.Optional(Type.String()),
	birthday: Type.Optional(Type.String()),
	isFanReferralEnabled: Type.Optional(Type.Boolean()),
	fanReferralShare: Type.Optional(Type.Number()),
	marketingContentLink: Type.Optional(Type.String()),
	referrerCode: Type.Optional(Type.String()),
});

assert<Equals<Static<typeof ProfileReqBodyValidator>, ProfileCreateReqBody>>();

export const ProfileLinkReqBodyValidator = Type.Object({
	link: Type.String(),
});

assert<
	Equals<Static<typeof ProfileLinkReqBodyValidator>, ProfileLinkReqBody>
>();

export const ProfileMigrationReqBodyValidator = Type.Object({
	migrationLink: Type.String(),
});

assert<
	Equals<
		Static<typeof ProfileMigrationReqBodyValidator>,
		ProfileMigrationReqBody
	>
>();

export const ProfileUpdateReqBodyValidator = Type.Object({
	displayName: Type.Optional(Type.String()),
	profileLink: Type.Optional(Type.String()),
	bio: Type.Optional(Type.String()),
	avatar: Type.Optional(Type.String()),
	cover: Type.Optional(Type.Array(Type.String())),
	isNSFW: Type.Optional(Type.Boolean()),
	subscriptionType: Type.Optional(Type.Enum(SubscriptionType)),
	migrationLink: Type.Optional(Type.String()),
	location: Type.Optional(Type.String()),
	birthday: Type.Optional(Type.String()),
	isFanReferralEnabled: Type.Optional(Type.Boolean()),
	fanReferralShare: Type.Optional(Type.Number()),
	marketingContentLink: Type.Optional(Type.String()),
});

assert<
	Equals<Static<typeof ProfileUpdateReqBodyValidator>, ProfileUpdateReqBody>
>();

export const SocialLinkReqBodyValidator = Type.Object({
	links: Type.Array(
		Type.Object({
			provider: Type.String(),
			url: Type.String(),
		}),
	),
});

assert<Equals<Static<typeof SocialLinkReqBodyValidator>, SocialLinkReqBody>>();

export const AgeVerifyOndatoWebhookReqBodyValidator = Type.Object({
	type: Type.String(),
	id: Type.String(),
	applicationId: Type.String(),
	createdUtc: Type.String(),
	deliveredUtc: Type.Optional(Type.String()),
	payload: Type.Object({
		id: Type.String(),
		applicationId: Type.String(),
		identityVerificationId: Type.Optional(Type.String()),
		status: Type.String(),
		statusReason: Type.Optional(Type.String()),
	}),
});

assert<
	Equals<
		Static<typeof AgeVerifyOndatoWebhookReqBodyValidator>,
		AgeVerifyOndatoWebhookReqBody
	>
>();

export const ProfileFilterQueryValidator = Type.Object({
	name: Type.Optional(Type.String()),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});
assert<
	Equals<Static<typeof ProfileFilterQueryValidator>, ProfileFilterQuery>
>();

export const PreviewCreateReqBodyValidator = Type.Object({
	previews: Type.Array(Type.String()),
});

assert<
	Equals<Static<typeof PreviewCreateReqBodyValidator>, PreviewCreateReqBody>
>();

export const AvatarCreateReqBodyValidator = Type.Object({
	avatar: Type.String(),
});

assert<
	Equals<Static<typeof AvatarCreateReqBodyValidator>, AvatarCreateReqBody>
>();
