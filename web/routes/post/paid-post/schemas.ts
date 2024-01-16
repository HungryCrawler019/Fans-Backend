import { IPaidPost } from "../../../CommonAPISchemas.js";

export enum PaidPostSortTypeEnum {
	Latest = "Latest",
	Oldest = "Oldest",
}

type PaidPostSortType =
	(typeof PaidPostSortTypeEnum)[keyof typeof PaidPostSortTypeEnum];
export interface PaidPostUpdateReqBody {
	price?: number;
	currency?: string;
	thumb?: string;
}

export type PaidPostRespBody = IPaidPost;

export interface PurchasePaidPostReqBody {
	postId: string;
	customerPaymentProfileId: string;
	fanReferralCode?: string;
}

export interface PaidPostPriceReqQuery {
	id: string;
	customerPaymentProfileId?: string;
}

export interface PaidPostQuery {
	sort?: PaidPostSortType;
	page?: number;
	size?: number;
}
