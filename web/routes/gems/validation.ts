import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	PriceReqBody,
	TipReqBody,
	StripeGemPurchaseReqBody,
	PayPalGemPurchaseReqBody,
	AuthorizeNetGemPurchaseReqBody,
	CameoPriceReqQuery,
	PurchaseCameoReqBody,
} from "./schemas.js";

export const PriceReqBodyValidator = Type.Object({
	gems: Type.Number(),
	service: Type.String(),
	customerInformation: Type.Object({
		country: Type.String(),
		state: Type.String(),
		address: Type.String(),
		city: Type.String(),
		zip: Type.String(),
	}),
});

assert<Equals<Static<typeof PriceReqBodyValidator>, PriceReqBody>>();

export const TipReqBodyValidator = Type.Object({
	creatorId: Type.String(),
	gems: Type.Number(),
	message: Type.Optional(Type.String()),
	fanReferralCode: Type.Optional(Type.String()),
});

assert<Equals<Static<typeof TipReqBodyValidator>, TipReqBody>>();

export const StripeGemPurchaseReqBodyValidator = Type.Object({
	gems: Type.Number(),
	customerInformation: Type.Object({
		country: Type.String(),
		state: Type.String(),
		address: Type.String(),
		city: Type.String(),
		zip: Type.String(),
	}),
});

assert<
	Equals<
		Static<typeof StripeGemPurchaseReqBodyValidator>,
		StripeGemPurchaseReqBody
	>
>();

export const PayPalGemPurchaseReqBodyValidator = Type.Object({
	gems: Type.Number(),
	customerInformation: Type.Object({
		country: Type.String(),
		state: Type.String(),
		address: Type.String(),
		city: Type.String(),
		zip: Type.String(),
	}),
});

assert<
	Equals<
		Static<typeof PayPalGemPurchaseReqBodyValidator>,
		PayPalGemPurchaseReqBody
	>
>();

export const AuthorizeNetGemPurchaseReqBodyValidator = Type.Object({
	gems: Type.Number(),
	opaqueDataValue: Type.String(),
	customerInformation: Type.Object({
		firstName: Type.String(),
		lastName: Type.String(),
		country: Type.String(),
		state: Type.String(),
		address: Type.String(),
		city: Type.String(),
		zip: Type.String(),
	}),
});

assert<
	Equals<
		Static<typeof AuthorizeNetGemPurchaseReqBodyValidator>,
		AuthorizeNetGemPurchaseReqBody
	>
>();

export const CameoPriceReqQueryValidator = Type.Object({
	price: Type.Number(),
	customerPaymentProfileId: Type.Optional(Type.String()),
});

assert<
	Equals<Static<typeof CameoPriceReqQueryValidator>, CameoPriceReqQuery>
>();

export const PurchaseCameoReqBodyValidator = Type.Object({
	price: Type.Number(),
	creatorId: Type.String(),
	customerPaymentProfileId: Type.String(),
});

assert<
	Equals<Static<typeof PurchaseCameoReqBodyValidator>, PurchaseCameoReqBody>
>();
