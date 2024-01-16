import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	PlaylistCreateReqBody,
	PlaylistFilterQuery,
	PlaylistUpdateReqBody,
} from "./schemas.js";

export const PlaylistCreateReqBodyValidator = Type.Object({
	title: Type.String(),
	description: Type.Optional(Type.String()),
	thumbId: Type.String(),
	isPrivate: Type.Boolean(),
	posts: Type.Array(Type.String({ format: "snowflake" })),
});
assert<
	Equals<Static<typeof PlaylistCreateReqBodyValidator>, PlaylistCreateReqBody>
>();

export const PlaylistUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	thumbId: Type.Optional(Type.String()),
	isPrivate: Type.Optional(Type.Boolean()),
	posts: Type.Optional(Type.Array(Type.String({ format: "snowflake" }))),
});
assert<
	Equals<Static<typeof PlaylistUpdateReqBodyValidator>, PlaylistUpdateReqBody>
>();

export const PlaylistFilterQueryValidator = Type.Object({
	title: Type.Optional(Type.String()),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});
assert<
	Equals<Static<typeof PlaylistFilterQueryValidator>, PlaylistFilterQuery>
>();
