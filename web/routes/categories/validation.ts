import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { CategoryCreateReqBody, CategoryUpdateReqBody } from "./schemas.js";

export const CategoryCreateReqBodyValidator = Type.Object({
	name: Type.String(),
	isActive: Type.Optional(Type.Boolean()),
	roleIds: Type.Optional(Type.Array(Type.String({ format: "snowflake" }))),
	postIds: Type.Optional(Type.Array(Type.String({ format: "snowflake" }))),
});

assert<
	Equals<Static<typeof CategoryCreateReqBodyValidator>, CategoryCreateReqBody>
>();

export const CategoryUpdateReqBodyValidator = Type.Object({
	name: Type.Optional(Type.String()),
	isActive: Type.Optional(Type.Boolean()),
	roleIds: Type.Optional(Type.Array(Type.String({ format: "snowflake" }))),
	postIds: Type.Optional(Type.Array(Type.String({ format: "snowflake" }))),
});

assert<
	Equals<Static<typeof CategoryUpdateReqBodyValidator>, CategoryUpdateReqBody>
>();
