import { CampaignType, DurationType, PromotionType } from "@prisma/client";
import { ICampaign } from "../../../../CommonAPISchemas.js";

export interface CampaignCreateBody {
	duration?: number;
	durationType?: DurationType;
	endDate?: string;
	limit?: number;
	discount?: number;
	type: PromotionType;
	applicable: CampaignType;
	roles?: string[];
}

export interface CampaignUpdateBody {
	duration?: number;
	durationType?: DurationType;
	endDate?: string;
	limit?: number;
	discount?: number;
	type?: PromotionType;
	applicable?: CampaignType;
}

export type CampaignRespBody = ICampaign;
