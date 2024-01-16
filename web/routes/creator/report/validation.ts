import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	UserReportCreateReqBody,
	UserReportProcessReqBody,
} from "./schemas.js";
import { ProfileReportFlag, ReportStatus } from "@prisma/client";

export const UserReportCreateReqBodyValidator = Type.Object({
	userId: Type.Required(Type.String({ format: "snowflake" })),
	flag: Type.Enum(ProfileReportFlag),
	reason: Type.Optional(Type.String()),
});
assert<
	Equals<
		Static<typeof UserReportCreateReqBodyValidator>,
		UserReportCreateReqBody
	>
>();

export const UserReportProcessReqBodyValidator = Type.Object({
	status: Type.Enum(ReportStatus),
});
assert<
	Equals<
		Static<typeof UserReportProcessReqBodyValidator>,
		UserReportProcessReqBody
	>
>();
