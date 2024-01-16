import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	ProfileReportCreateReqBody,
	ProfileReportProcessReqBody,
} from "./schemas.js";
import { ProfileReportFlag, ReportStatus } from "@prisma/client";

export const ProfileReportCreateReqBodyValidator = Type.Object({
	profileId: Type.Required(Type.String()),
	reportFlag: Type.Enum(ProfileReportFlag),
	reason: Type.Optional(Type.String()),
});
assert<
	Equals<
		Static<typeof ProfileReportCreateReqBodyValidator>,
		ProfileReportCreateReqBody
	>
>();

export const ProfileReportProcessReqBodyValidator = Type.Object({
	status: Type.Enum(ReportStatus),
});
assert<
	Equals<
		Static<typeof ProfileReportProcessReqBodyValidator>,
		ProfileReportProcessReqBody
	>
>();
