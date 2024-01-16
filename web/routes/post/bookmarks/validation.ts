import { PostType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { BookmarksFilterQuery } from "./schemas.js";

export const BookmarksFilterQueryValidator = Type.Object({
	query: Type.Optional(Type.String()),
	type: Type.Optional(Type.Enum(PostType)),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});
assert<
	Equals<Static<typeof BookmarksFilterQueryValidator>, BookmarksFilterQuery>
>();
