// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/gems/schemas.ts
// backend: web/routes/gems/schemas.ts

export interface PriceReqBody {
	gems: number;
	service: string;
	customerInformation: {
		country: string;
		state: string;
		address: string;
		city: string;
		zip: string;
	};
}

export interface TipReqBody {
	creatorId: string;
	gems: number;
	message?: string;
	fanReferralCode?: string;
}

export interface StripeGemPurchaseReqBody {
	gems: number;
	customerInformation: {
		country: string;
		state: string;
		address: string;
		city: string;
		zip: string;
	};
}

export interface PayPalGemPurchaseReqBody {
	gems: number;
	customerInformation: {
		country: string;
		state: string;
		address: string;
		city: string;
		zip: string;
	};
}

export interface AuthorizeNetGemPurchaseReqBody {
	gems: number;
	opaqueDataValue: string;
	customerInformation: {
		firstName: string;
		lastName: string;
		country: string;
		state: string;
		address: string;
		city: string;
		zip: string;
	};
}

export interface CameoPriceReqQuery {
	price: number;
	customerPaymentProfileId?: string;
}

export interface PurchaseCameoReqBody {
	price: number;
	creatorId: string;
	customerPaymentProfileId: string;
}
