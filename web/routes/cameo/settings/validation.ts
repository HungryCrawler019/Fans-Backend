import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { UpdateCameoSettings } from "./schemas.js";
import { CameoContentType, CameoVolumeTimeUnit } from "@prisma/client";

export const UpdateCameoPreferencesValidator = Type.Object({
	volumeLimit: Type.Optional(
		Type.Object({
			unit: Type.Union([
				Type.Literal(CameoVolumeTimeUnit.Daily),
				Type.Literal(CameoVolumeTimeUnit.Weekly),
				Type.Literal(CameoVolumeTimeUnit.Monthly),
			]),
			amount: Type.Union([Type.Integer(), Type.Null()]),
		}),
	),
	fulfillmentTime: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
	description: Type.Optional(Type.String()),
	sexualContentEnabled: Type.Optional(Type.Boolean()),
	contentTypes: Type.Optional(
		Type.Array(
			Type.Union([
				Type.Literal(CameoContentType.Acting),
				Type.Literal(CameoContentType.Advice),
				Type.Literal(CameoContentType.Roast),
				Type.Literal(CameoContentType.EighteenPlus),
				Type.Literal(CameoContentType.Shoutout),
				Type.Literal(CameoContentType.EighteenPlusSexual),
			]),
			{ uniqueItems: true },
		),
	),
	customContentType: Type.Optional(Type.String()),
	agreedToTerms: Type.Optional(Type.Boolean()),
	notificationNewRequests: Type.Optional(Type.Boolean()),
	notificationPendingVideos: Type.Optional(Type.Boolean()),
	notificationCompletedRequests: Type.Optional(Type.Boolean()),
	notificationsByEmail: Type.Optional(Type.Boolean()),
	notificationsByPhone: Type.Optional(Type.Boolean()),
	customVideoEnabled: Type.Optional(Type.Boolean()),
});

assert<
	Equals<Static<typeof UpdateCameoPreferencesValidator>, UpdateCameoSettings>
>();
