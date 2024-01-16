import { Static, Type } from "@sinclair/typebox";
import { Equals, assert } from "tsafe";
import {
	NotificationsMarkReadParams,
	NotificationSettingsReqBody,
} from "./schemas.js";

export const NotificationsMarkReadParamsValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});

assert<
	Equals<
		Static<typeof NotificationsMarkReadParamsValidator>,
		NotificationsMarkReadParams
	>
>();

export const NotificationSettingsReqBodyValidator = Type.Object({
	newSubscriberCreatorEmail: Type.Boolean(),
	tipCreatorEmail: Type.Boolean(),
	paidPostCreatorEmail: Type.Boolean(),
	messageCreatorEmail: Type.Boolean(),
	chargebackCreatorEmail: Type.Boolean(),
	messageFanEmail: Type.Boolean(),
	transactionFanEmail: Type.Boolean(),
	chargebackFanEmail: Type.Boolean(),
	newPostFanEmail: Type.Boolean(),
	newSubscriberCreatorInApp: Type.Boolean(),
	cancelSubscriptionCreatorInApp: Type.Boolean(),
	tipCreatorInApp: Type.Boolean(),
	paidPostCreatorInApp: Type.Boolean(),
	chargebackCreatorInApp: Type.Boolean(),
	messageCreatorInApp: Type.Boolean(),
	commentCreatorInApp: Type.Boolean(),
	likeCreatorInApp: Type.Boolean(),
	messageFanInApp: Type.Boolean(),
	transactionFanInApp: Type.Boolean(),
	chargebackFanInApp: Type.Boolean(),
	replyCommentInApp: Type.Boolean(),
	mentionedInApp: Type.Boolean(),
});

assert<
	Equals<
		Static<typeof NotificationSettingsReqBodyValidator>,
		NotificationSettingsReqBody
	>
>();
