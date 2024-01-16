import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	CreateMeetingDurationBody,
	UpdateMeetingDurationBody,
	UpdateMeetingEnabledBody,
} from "./schemas.js";

export const CreateMeetingDurationBodyValidator = Type.Object({
	length: Type.Integer({ maximum: 3 * 60, multipleOf: 15 }),
	price: Type.Number(),
	currency: Type.String({ pattern: "^usd$" }),
	isEnabled: Type.Optional(Type.Boolean()),
});
assert<
	Equals<
		Static<typeof CreateMeetingDurationBodyValidator>,
		CreateMeetingDurationBody
	>
>();

export const UpdadteMeetingDurationBodyValidator = Type.Object({
	length: Type.Optional(Type.Integer({ maximum: 3 * 60, multipleOf: 15 })),
	price: Type.Optional(Type.Number()),
	currency: Type.Optional(Type.String({ pattern: "^usd$" })),
	isEnabled: Type.Optional(Type.Boolean()),
});
assert<
	Equals<
		Static<typeof UpdadteMeetingDurationBodyValidator>,
		UpdateMeetingDurationBody
	>
>();

export const UpdateMeetingEnabledBodyValidator = Type.Object({
	isEnabled: Type.Boolean(),
});
assert<
	Equals<
		Static<typeof UpdateMeetingEnabledBodyValidator>,
		UpdateMeetingEnabledBody
	>
>();
