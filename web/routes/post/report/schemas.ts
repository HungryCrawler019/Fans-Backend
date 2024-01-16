import { PostReportFlag, ReportStatus } from "@prisma/client";
import {
	IPost,
	IPostReport,
	IProfile,
	IUser,
} from "../../../CommonAPISchemas.js";

export interface CreatePostReportReqBody {
	postId: string;
	reportFlag: PostReportFlag;
	reason?: string;
}

export interface ProcessPostReportReqBody {
	status: ReportStatus;
}

export type PostReportRespBody = IPostReport & {
	post?: IPost;
};

export interface PostReportsRespBody {
	reports: PostReportRespBody[];
	page: number;
	size: number;
	total: number;
}

export type CreatePostReportRespBody = IProfile & { user: IUser };
