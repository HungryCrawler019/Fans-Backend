import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	AddCreatorReqBody,
	UserlistCreateReqBody,
	UserlistUpdateReqBody,
} from "./schemas.js";

export const UserlistCreateReqBodyValidator = Type.Object({
	title: Type.String(),
	creators: Type.Array(Type.String()),
});
assert<
	Equals<Static<typeof UserlistCreateReqBodyValidator>, UserlistCreateReqBody>
>();

export const UserlistUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	enabled: Type.Optional(Type.Boolean()),
	creators: Type.Optional(Type.Array(Type.String())),
});
assert<
	Equals<Static<typeof UserlistUpdateReqBodyValidator>, UserlistUpdateReqBody>
>();

export const AddCreatorReqBodyValidator = Type.Object({
	creatorId: Type.String({ format: "snowflake" }),
});
assert<Equals<Static<typeof AddCreatorReqBodyValidator>, AddCreatorReqBody>>();
