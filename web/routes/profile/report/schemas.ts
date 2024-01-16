import { ProfileReportFlag, ReportStatus } from "@prisma/client";
import { IProfile, IProfileReport } from "../../../CommonAPISchemas.js";

export interface ProfileReportCreateReqBody {
	profileId: string;
	reportFlag: ProfileReportFlag;
	reason?: string;
}

export interface ProfileReportProcessReqBody {
	status: ReportStatus;
}

export type ProfileReportRespBody = IProfileReport & {
	profile: IProfile;
};

export interface ProfileReportsRespBody {
	reports: ProfileReportRespBody[];
	page: number;
	size: number;
	total: number;
}
