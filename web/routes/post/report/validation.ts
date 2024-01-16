import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	CreatePostReportReqBody,
	ProcessPostReportReqBody,
} from "./schemas.js";
import { PostReportFlag, ReportStatus } from "@prisma/client";

export const CreatePostReportReqBodyValidator = Type.Object({
	postId: Type.Required(Type.String()),
	reportFlag: Type.Enum(PostReportFlag),
	reason: Type.Optional(Type.String()),
});
assert<
	Equals<
		Static<typeof CreatePostReportReqBodyValidator>,
		CreatePostReportReqBody
	>
>();

export const ProcessPostReportReqBodyValidator = Type.Object({
	status: Type.Enum(ReportStatus),
});
assert<
	Equals<
		Static<typeof ProcessPostReportReqBodyValidator>,
		ProcessPostReportReqBody
	>
>();
