import { ReportStatus, StoryReportFlag } from "@prisma/client";
import {
	IPost,
	IPostReport,
	IStory,
	IStoryReport,
} from "../../../CommonAPISchemas.js";

export interface StoryReportCreateReqBody {
	storyId: string;
	reportFlag: StoryReportFlag;
	reason?: string;
}

export interface StoryReportProcessReqBody {
	status: ReportStatus;
}

export type StoryReportRespBody = IStoryReport & {
	story?: IStory;
};

export interface StoryReportsRespBody {
	reports: StoryReportRespBody[];
	page: number;
	size: number;
	total: number;
}
