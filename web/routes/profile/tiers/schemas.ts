import { ITier } from "../../../CommonAPISchemas.js";

export interface TierCreateReqBody {
	title: string;
	price: number;
	currency: string;
	description: string;
	cover: string;
	perks: string[];
}

export interface TierUpdateReqBody {
	title?: string;
	price?: number;
	currency?: string;
	description?: string;
	cover?: string;
	perks?: string[];
}

export type TierRespBody = ITier;

export interface TiersRespBody {
	tiers: ITier[];
	page: number;
	size: number;
	total: number;
}
