import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	CreateCustomVideoDurationBody,
	UpdateCustomVideoDurationEnabledBody,
} from "./schemas.js";

export const CreateCustomVideoDurationBodyValidator = Type.Object({
	length: Type.Integer({ minimum: 60, maximum: 3 * 60 * 60 }), // duration in seconds
	price: Type.Number({ minimum: 2, maximum: 200 }),
	currency: Type.String({ pattern: "^usd$" }),
	isEnabled: Type.Optional(Type.Boolean()),
});
assert<
	Equals<
		Static<typeof CreateCustomVideoDurationBodyValidator>,
		CreateCustomVideoDurationBody
	>
>();

export const UpdateCustomVideoDurationEnabledBodyValidator = Type.Object({
	isEnabled: Type.Boolean(),
});
assert<
	Equals<
		Static<typeof UpdateCustomVideoDurationEnabledBodyValidator>,
		UpdateCustomVideoDurationEnabledBody
	>
>();
