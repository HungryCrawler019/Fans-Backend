import { IPoll } from "../../../CommonAPISchemas.js";

export type PollRespBody = IPoll;
export interface PollUpdateReqBody {
	question?: string;
	description?: string;
	answers?: string[];
	thumb?: string;
	endDate?: string;
	isPublic?: boolean;
	roles?: string[];
}

export interface VotePollReqBody {
	pollId: string;
	answerId: string;
}

export interface VetoPollReqBody {
	pollId: string;
	answerId: string;
}
