import {
	IFanReferral,
	IFanReferralTransaction,
	IProfile,
} from "../../../CommonAPISchemas.js";

export enum ActiveLinkSortType {
	largest_percentage = "largest_percentage",
	highest_earning = "highest_earning",
	highest_ctr = "highest_ctr",
}

export enum LinkPerformanceSortType {
	highest_earning = "highest_earning",
	highest_ctr = "highest_ctr",
}

export enum TransactionSortType {
	daily = "daily",
	weekly = "weekly",
	monthly = "monthly",
	yearly = "yearly",
}

export interface ActiveLinksPageQueryParams {
	sort?: ActiveLinkSortType;
	query?: string;
	page?: number;
	size?: number;
}

export type ActiveLink = IProfile & {
	totalEarned: number;
	totalVisitCount: number;
	fanReferrals: IFanReferral[];
};

export interface ActiveLinksRespBody {
	activeLinks: ActiveLink[];
	page: number;
	size: number;
	total: number;
}

export type FanReferralRespBody = IFanReferral & {
	profile: IProfile;
	totalEarning: number;
	totalFans: number;
	transactions: IFanReferralTransaction[];
};

export interface CreateFanReferralReqBody {
	profileId: string;
	code?: string;
}

export interface UpdateFanReferralReqBody {
	code: string;
}

export interface EarningRespBody {
	totalEarning: number;
	transactions: IFanReferralTransaction[];
	period: string;
}

export interface TransactionsQueryParams {
	sort?: TransactionSortType;
	query?: string;
	from?: string;
	to?: string;
	page?: number;
	size?: number;
}

export interface TransactionsRespBody {
	transactions: (IFanReferralTransaction & { creator: IProfile })[];
	page: number;
	size: number;
	total: number;
}

export interface LinkPerformanceQueryParams {
	sort?: LinkPerformanceSortType;
	query?: string;
	from?: string;
	to?: string;
	page?: number;
	size?: number;
}

export interface LinkPerformanceRespBody {
	fanReferrals: (IFanReferral & {
		profile: IProfile;
		fanReferralTransactions: IFanReferralTransaction[];
	})[];
	page: number;
	size: number;
	total: number;
}

export interface CodeParams {
	code: string;
}
