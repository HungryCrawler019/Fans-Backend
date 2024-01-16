// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/payout/schemas.ts
// backend: web/routes/payout/schemas.ts

import { IPayoutLog, IStripeForm } from "../../CommonAPISchemas.js";

export interface PayoutMethodReqBody {
	bankInfo?: IStripeForm;
	paypalEmail?: string;
	country: string;
	entityType: string;
	usCitizenOrResident: boolean;
}

export interface GetPayoutMethodReqBody {
	id: string;
}

export interface PutPayoutMethodReqBody {
	id: string;
}

export interface DeletePayoutMethodReqBody {
	id: string;
}

export interface PayoutScheduleResBody {
	mode: string;
	threshold?: number;
	maxPayout: number;
	totalPayoutAmount: number;
}

export interface UpdatePayoutScheduleReqBody {
	mode: string;
	threshold?: number;
}

export type PayoutLogRespBody = IPayoutLog;

export interface PayoutLogsRespBody {
	payoutLogs: PayoutLogRespBody[];
	page: number;
	size: number;
	total: number;
}
