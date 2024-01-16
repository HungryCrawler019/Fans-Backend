import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	StoryCommentCreateReqBody,
	StoryCommentUpdateReqBody,
} from "./schemas.js";

export const StoryCommentCreateReqBodyValidator = Type.Object({
	storyId: Type.Required(Type.String()),
	parentCommentId: Type.Optional(Type.String()),
	content: Type.Required(Type.String()),
});
assert<
	Equals<
		Static<typeof StoryCommentCreateReqBodyValidator>,
		StoryCommentCreateReqBody
	>
>();

export const StoryCommentUpdateReqBodyValidator = Type.Object({
	content: Type.Required(Type.String()),
});
assert<
	Equals<
		Static<typeof StoryCommentUpdateReqBodyValidator>,
		StoryCommentUpdateReqBody
	>
>();
