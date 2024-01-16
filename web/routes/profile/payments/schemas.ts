// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/payments/schemas.ts
// backend: web/routes/payments/schemas.ts

export interface PaymentMethodReqBody {
	opaqueDataValue: string;
	customerInformation: {
		firstName: string;
		lastName: string;
		country: string;
		address: string;
		city: string;
		state: string;
		zip: string;
	};
}

export interface UpdatePaymentMethodReqBody {
	customerPaymentProfileId: string;
	opaqueDataValue: string;
	customerInformation: {
		firstName: string;
		lastName: string;
		country: string;
		address: string;
		city: string;
		state: string;
		zip: string;
	};
}

export interface FetchPaymentMethodReqBody {
	paymentMethodId: string;
	customerPaymentProfileId: string;
}

export interface DeletePaymentMethodReqBody {
	paymentMethodId: string;
	customerPaymentProfileId: string;
}

export interface TransactionReqQueryParams {
	page?: number;
	limit?: number;
	search?: string;
}

export interface Transaction {
	id: number;
	creator: {
		id: number;
		username: string;
		displayName: string;
		avatar: string;
	};
	description: string;
	amount: number;
	date: Date;
	processingFee: number;
	platformFee: number;
}

export type TransactionRespBody = Transaction[];
