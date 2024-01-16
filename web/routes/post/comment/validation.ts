import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	CommentCreateReqBody,
	CommentUpdateReqBody,
	CommentReportReqBody,
} from "./schemas.js";

export const CommentCreateReqBodyValidator = Type.Object({
	postId: Type.Required(Type.String()),
	parentCommentId: Type.Optional(Type.String({ format: "snowflake" })),
	content: Type.Required(Type.String()),
});
assert<
	Equals<Static<typeof CommentCreateReqBodyValidator>, CommentCreateReqBody>
>();

export const CommentUpdateReqBodyValidator = Type.Object({
	content: Type.Required(Type.String()),
});
assert<
	Equals<Static<typeof CommentUpdateReqBodyValidator>, CommentUpdateReqBody>
>();

export const CommentReportReqBodyValidator = Type.Object({
	reason: Type.Optional(Type.String()),
});
assert<
	Equals<Static<typeof CommentReportReqBodyValidator>, CommentReportReqBody>
>();
