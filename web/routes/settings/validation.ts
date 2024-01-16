import { GenderType, LanguageType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { Equals, assert } from "tsafe";
import {
	ChangePasswordReqBody,
	UpdateEmailReqBody,
	UpdateSettingReqBody,
	VerifyDeleteAccountReqBody,
	VerifyNewEmailReqBody,
	CameoSettingsUpdateReqBody,
} from "./schemas.js";

export const ChangePasswordReqBodyValidator = Type.Object({
	oldPassword: Type.String(),
	newPassword: Type.String(),
});
assert<
	Equals<Static<typeof ChangePasswordReqBodyValidator>, ChangePasswordReqBody>
>();

export const UpdateSettingReqBodyValidator = Type.Object({
	username: Type.Optional(Type.String()),
	birthdate: Type.Optional(Type.String()),
	phonenumber: Type.Optional(Type.String()),
	country: Type.Optional(Type.String()),
	displayName: Type.Optional(Type.String()),
	gender: Type.Optional(Type.Enum(GenderType)),
	language: Type.Optional(Type.Enum(LanguageType)),
	isShowProfile: Type.Optional(Type.Boolean()),
});
assert<
	Equals<Static<typeof UpdateSettingReqBodyValidator>, UpdateSettingReqBody>
>();

export const UpdateEmailReqBodyValidator = Type.Object({
	email: Type.String(),
});
assert<
	Equals<Static<typeof UpdateEmailReqBodyValidator>, UpdateEmailReqBody>
>();

export const VerifyNewEmailReqBodyValidator = Type.Object({
	code: Type.String(),
	newEmail: Type.String(),
});

assert<
	Equals<Static<typeof VerifyNewEmailReqBodyValidator>, VerifyNewEmailReqBody>
>();

export const VerifyDeleteAccountReqBodyValidator = Type.Object({
	code: Type.String(),
});
assert<
	Equals<
		Static<typeof VerifyDeleteAccountReqBodyValidator>,
		VerifyDeleteAccountReqBody
	>
>();

const PricesDurationValidator = Type.Object({
	price: Type.Number(),
	duration: Type.Number(),
	active: Type.Boolean(),
});

const CameoNotificationsValidator = Type.Object({
	newRequests: Type.Boolean(),
	pendingVideos: Type.Boolean(),
	completedRequests: Type.Boolean(),
	notificationsByEmail: Type.Boolean(),
	notificationsByPhone: Type.Boolean(),
});

const RequestLimitationsValidator = Type.Object({
	fulFillmentTimeFrame: Type.String(),
	numberRequestsType: Type.String(),
	numberRequestsValue: Type.Number(),
});

const VacationModeValidator = Type.Object({
	startDate: Type.String(),
	endDate: Type.String(),
});

const SocialMediaUrlValidator = Type.Object({
	id: Type.String(),
	value: Type.String(),
	title: Type.String(),
});

export const CameoSettingsUpdateReqBodyValidator = Type.Object({
	cameo: Type.Object({
		pricesDuration: Type.Optional(Type.Array(PricesDurationValidator)),
		contentPreferences: Type.Optional(Type.Array(Type.String())),
		videoCallsEnabled: Type.Optional(Type.Boolean()),
		tos: Type.Optional(Type.Boolean()),
		requestLimitations: Type.Optional(RequestLimitationsValidator),
		responseDescription: Type.Optional(Type.String()),
		uploadPreviews: Type.Optional(Type.Array(Type.String())),
		notifications: Type.Optional(CameoNotificationsValidator),
		customVideoOrdersEnabled: Type.Optional(Type.Boolean()),
		vacationMode: Type.Optional(Type.Boolean()),
		vacationModeInterval: Type.Optional(VacationModeValidator),
		sexualContent: Type.Optional(Type.Boolean()),
		additionalContentPreferences: Type.Optional(Type.String()),
	}),
});

assert<
	Equals<
		Static<typeof CameoSettingsUpdateReqBodyValidator>,
		CameoSettingsUpdateReqBody
	>
>();

export const FanProfileUpdateReqBodyValidator = Type.Object({
	fanProfile: Type.Object({
		bio: Type.Optional(Type.String()),
		displayName: Type.Optional(Type.String()),
		socialMedias: Type.Optional(Type.Array(SocialMediaUrlValidator)),
		theme: Type.Optional(Type.String()),
	}),
});

assert<
	Equals<
		Static<typeof CameoSettingsUpdateReqBodyValidator>,
		CameoSettingsUpdateReqBody
	>
>();
