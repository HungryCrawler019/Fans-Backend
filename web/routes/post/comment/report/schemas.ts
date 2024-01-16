import { ReportStatus } from "@prisma/client";
import { IComment, ICommentReport } from "../../../../CommonAPISchemas.js";

export interface CommentReportCreateReqBody {
	commentId: string;
	reason?: string;
}

export interface CommentReportProcessReqBody {
	status: ReportStatus;
}

export type CommentReportRespBody = ICommentReport & {
	comment: IComment;
};

export interface CommentReportsRespBody {
	reports: CommentReportRespBody[];
	page: number;
	size: number;
	total: number;
}
