import { ProfileReportFlag, ReportStatus } from "@prisma/client";
import { IUser, IUserReport } from "../../../CommonAPISchemas.js";

export interface UserReportCreateReqBody {
	userId: string;
	flag: ProfileReportFlag;
	reason?: string;
}

export interface UserReportProcessReqBody {
	status: ReportStatus;
}

export type UserReportRespBody = IUserReport & {
	user: IUser;
};

export interface UserReportsRespBody {
	reports: UserReportRespBody[];
	page: number;
	size: number;
	total: number;
}
