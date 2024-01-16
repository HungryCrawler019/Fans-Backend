import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	StoryReportCreateReqBody,
	StoryReportProcessReqBody,
} from "./schemas.js";
import { StoryReportFlag, ReportStatus } from "@prisma/client";

export const StoryReportCreateReqBodyValidator = Type.Object({
	storyId: Type.Required(Type.String()),
	reportFlag: Type.Enum(StoryReportFlag),
	reason: Type.Optional(Type.String()),
});
assert<
	Equals<
		Static<typeof StoryReportCreateReqBodyValidator>,
		StoryReportCreateReqBody
	>
>();

export const StoryReportProcessReqBodyValidator = Type.Object({
	status: Type.Enum(ReportStatus),
});
assert<
	Equals<
		Static<typeof StoryReportProcessReqBodyValidator>,
		StoryReportProcessReqBody
	>
>();
