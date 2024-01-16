import { DateFilterQueryParams } from "../../../../common/validators/schemas.js";
import {
	CreatorReferralTransactionType,
	ICreatorReferral,
	ICreatorReferralTransaction,
	IProfile,
	IUser,
} from "../../../CommonAPISchemas.js";

export enum ReferentSortType {
	highest_earnings = "highest_earnings",
	highest_mmr = "highest_mmr",
}

export enum CreatorReferralSortType {
	highest_earnings = "highest_earnings",
	highest_ctr = "highest_ctr",
}

export interface CodeWithDateFilterQueryParams {
	from?: string;
	to?: string;
	code?: string;
}

export interface ReferentFilterQueryParams {
	from?: string;
	to?: string;
	code?: string;
	sort?: ReferentSortType;
}

export interface CreatorReferralFilterQueryParams {
	from?: string;
	to?: string;
	sort?: CreatorReferralSortType;
}

export interface CreateCreatorReferralReqBody {
	code: string;
}

export type UpdateCreatorReferralReqBody = CreateCreatorReferralReqBody;

export interface CategoryUpdateReqBody {
	name?: string;
	isActive?: boolean;
	postIds?: string[];
	roleIds?: string[];
}

export type CreatorReferralRespBody = ICreatorReferral;

export interface CreatorReferralsRespBody {
	creatorReferrals: CreatorReferralRespBody[];
}

export interface EarningRespBody {
	totalEarning: number;
	percentage: number;
	creatorCount: number;
	transactions: ICreatorReferralTransaction[];
	period: string;
}

export interface TransactionsRespBody {
	transactions: (ICreatorReferralTransaction & {
		referent: IProfile & { user?: IUser };
	})[];
	page: number;
	size: number;
	total: number;
}

export interface CreatorsRespBody {
	creators: {
		referentId: string;
		amount?: number;
		referent: IProfile | null;
		subscriberCount: number | null;
	}[];
}

export interface LinkPerformanceRespBody {
	creatorReferrals: {
		id: string;
		code: string;
		amount: number;
		referentCount: number;
		visitCount: number;
		percentage: number;
	}[];
}

export interface CodeParams {
	code: string;
}
