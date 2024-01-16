import { CampaignType, PromotionType } from "@prisma/client";
import { BundleCreateBody } from "./bundles/schemas.js";
import { CampaignCreateBody } from "./campaigns/schemas.js";
import {
	IBundle,
	ICampaign,
	ISubscription,
} from "../../../CommonAPISchemas.js";

export interface SubscriptionCreateReqBody {
	title: string;
	currency: string;
	price: number;
	campaigns?: CampaignCreateBody[];
	bundles?: BundleCreateBody[];
}

export interface SubscriptionUpdateReqBody {
	title?: string;
	currency?: string;
	price?: number;
}

export type SubscriptionRespBody = ISubscription & {
	campaigns: ICampaign[];
	bundles: IBundle[];
};

export interface SubscriptionsRespBody {
	subscriptions: SubscriptionRespBody[];
}
