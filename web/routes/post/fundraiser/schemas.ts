import { IFundraiser } from "../../../CommonAPISchemas.js";

export interface FundraiserUpdateReqBody {
	title?: string;
	caption?: string;
	thumb?: string;
	price?: number;
	currency?: string;
	endDate?: string;
	isXpAdd?: boolean;
}

export type FundraiserRespBody = IFundraiser;
