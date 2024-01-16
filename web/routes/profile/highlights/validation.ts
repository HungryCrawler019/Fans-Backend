import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { HighlightCreateReqBody, HighlightUpdateReqBody } from "./schemas.js";

export const HighlightCreateReqBodyValidator = Type.Object({
	title: Type.String(),
	cover: Type.String(),
	stories: Type.Array(Type.String()),
});

assert<
	Equals<
		Static<typeof HighlightCreateReqBodyValidator>,
		HighlightCreateReqBody
	>
>();

export const HighlightUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	cover: Type.Optional(Type.String()),
	stories: Type.Optional(Type.Array(Type.String())),
});

assert<
	Equals<
		Static<typeof HighlightUpdateReqBodyValidator>,
		HighlightUpdateReqBody
	>
>();
