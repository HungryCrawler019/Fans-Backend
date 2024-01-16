// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/subscriptions/schemas.ts
// backend: web/routes/subscriptions/schemas.ts

export interface SubscriptionHasAccessReqBody {
	creatorId: number;
}

export interface SubscriptionHasAccessRespBody {
	hasAccess: boolean;
}

export interface SubscribeFreeReqBody {
	id: string;
}

export interface SubscribeReqBody {
	id: string;
	bundleId?: string;
	customerPaymentProfileId: string;
	fanReferralCode?: string;
}

export interface SubscribePaymentMethodReqBody {
	id: string;
	customerPaymentProfileId: string;
}

export interface UnsubscribeReqBody {
	id: string;
}

export interface SubscriptionPriceReqQuery {
	id: string;
	bundleId?: string;
	customerPaymentProfileId?: string;
}

export interface SubscriptionPriceRespBody {
	amount: number;
	processingFee?: number;
	platformFee: number;
	vatFee: number;
	totalAmount: number;
	campaignId?: bigint;
	freeTrial?: boolean;
	freeTrialPeriod?: number;
	discount?: number;
	discountPeriod?: number;
}
