import { Type } from "@sinclair/typebox";

export const AppIdParamsValidator = Type.Object({
	appId: Type.String({ format: "snowflake" }),
});

export const AppIdAndIdParamsValidator = Type.Object({
	appId: Type.String({ format: "snowflake" }),
	id: Type.String({ format: "snowflake" }),
});

export const ApplicationCreateReqBodyValidator = Type.Object({
	name: Type.String(),
});

export const CreateWebhookReqBodyValidator = Type.Object({
	appId: Type.String({ format: "snowflake" }),
	target: Type.String(), // should add extra validation for https://...
});

export const IconCreateReqBodyValidator = Type.Object({
	icon: Type.String(),
	appId: Type.String(),
});

export const ApplicationUpdateReqBodyValidator = Type.Object({
	name: Type.Optional(Type.String()),
});
