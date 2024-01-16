import { IGiveaway } from "../../../CommonAPISchemas.js";

export interface GiveawayUpdateReqBody {
	prize?: string;
	thumb?: string;
	endDate?: string;
	winnerCount?: number;
	roles?: string[];
}

export type GiveawayRespBody = IGiveaway;
