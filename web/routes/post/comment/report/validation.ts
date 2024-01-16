import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	CommentReportCreateReqBody,
	CommentReportProcessReqBody,
} from "./schemas.js";
import { ReportStatus } from "@prisma/client";

export const CommentReportCreateReqBodyValidator = Type.Object({
	commentId: Type.Required(Type.String()),
	reason: Type.Optional(Type.String()),
});
assert<
	Equals<
		Static<typeof CommentReportCreateReqBodyValidator>,
		CommentReportCreateReqBody
	>
>();

export const CommentReportProcessReqBodyValidator = Type.Object({
	status: Type.Enum(ReportStatus),
});
assert<
	Equals<
		Static<typeof CommentReportProcessReqBodyValidator>,
		CommentReportProcessReqBody
	>
>();
