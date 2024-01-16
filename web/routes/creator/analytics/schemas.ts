// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/creator/analytics/schemas.ts
// backend: web/routes/creator/analytics/schemas.ts

export interface EarningsReqBody {
	startDate?: string;
	endDate?: string;
}

export interface RefundReqBody {
	id: string;
}

export interface PaidPostEarningsReqBody {
	postId: string;
	startDate?: string;
	endDate?: string;
}

export interface PaidPostPurchased {
	postId: string;
}
