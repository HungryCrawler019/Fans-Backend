import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	PaymentMethodReqBody,
	UpdatePaymentMethodReqBody,
	TransactionReqQueryParams,
	FetchPaymentMethodReqBody,
	DeletePaymentMethodReqBody,
} from "./schemas.js";

export const PaymentMethodReqBodyValidator = Type.Object({
	opaqueDataValue: Type.String(),
	customerInformation: Type.Object({
		firstName: Type.String(),
		lastName: Type.String(),
		country: Type.String(),
		address: Type.String(),
		city: Type.String(),
		state: Type.String(),
		zip: Type.String(),
	}),
});

assert<
	Equals<Static<typeof PaymentMethodReqBodyValidator>, PaymentMethodReqBody>
>();

export const UpdatePaymentMethodReqBodyValidator = Type.Object({
	customerPaymentProfileId: Type.String(),
	opaqueDataValue: Type.String(),
	customerInformation: Type.Object({
		firstName: Type.String(),
		lastName: Type.String(),
		country: Type.String(),
		address: Type.String(),
		city: Type.String(),
		state: Type.String(),
		zip: Type.String(),
	}),
});

assert<
	Equals<
		Static<typeof UpdatePaymentMethodReqBodyValidator>,
		UpdatePaymentMethodReqBody
	>
>();

export const TransactionReqQueryParamsValidator = Type.Object({
	page: Type.Optional(Type.Number()),
	limit: Type.Optional(Type.Number()),
	search: Type.Optional(Type.String()),
});

assert<
	Equals<
		Static<typeof TransactionReqQueryParamsValidator>,
		TransactionReqQueryParams
	>
>();

export const FetchPaymentMethodReqBodyValidator = Type.Object({
	paymentMethodId: Type.String(),
	customerPaymentProfileId: Type.String(),
});

assert<
	Equals<
		Static<typeof FetchPaymentMethodReqBodyValidator>,
		FetchPaymentMethodReqBody
	>
>();

export const DeletePaymentMethodReqBodyValidator = Type.Object({
	paymentMethodId: Type.String(),
	customerPaymentProfileId: Type.String(),
});

assert<
	Equals<
		Static<typeof DeletePaymentMethodReqBodyValidator>,
		DeletePaymentMethodReqBody
	>
>();
