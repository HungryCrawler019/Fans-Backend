import { UserType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { UserSearchPageQuery } from "./schemas.js";

export const UserSearchPageQueryValidator = Type.Object({
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
	query: Type.Optional(Type.String()),
	type: Type.Optional(Type.Enum(UserType)),
});

assert<
	Equals<Static<typeof UserSearchPageQueryValidator>, UserSearchPageQuery>
>();
