import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { RoleCreateReqBody, RoleUpdateReqBody } from "./schemas.js";

export const RoleCreateReqBodyValidator = Type.Object({
	name: Type.String(),
	color: Type.String(),
	icon: Type.Optional(Type.String()),
	customIcon: Type.Optional(Type.String()),
	level: Type.Number(),
});
assert<Equals<Static<typeof RoleCreateReqBodyValidator>, RoleCreateReqBody>>();

export const RoleUpdateReqBodyValidator = Type.Object({
	name: Type.Optional(Type.String()),
	color: Type.Optional(Type.String()),
	icon: Type.Optional(Type.String()),
	customIcon: Type.Optional(Type.String()),
	level: Type.Optional(Type.Number()),
});
assert<Equals<Static<typeof RoleUpdateReqBodyValidator>, RoleUpdateReqBody>>();
