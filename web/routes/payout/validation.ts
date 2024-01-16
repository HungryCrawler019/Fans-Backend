import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	PayoutMethodReqBody,
	UpdatePayoutScheduleReqBody,
	GetPayoutMethodReqBody,
	PutPayoutMethodReqBody,
	DeletePayoutMethodReqBody,
} from "./schemas.js";

export const GetPayoutMethodReqBodyValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});

assert<
	Equals<
		Static<typeof GetPayoutMethodReqBodyValidator>,
		GetPayoutMethodReqBody
	>
>();

export const PutPayoutMethodReqBodyValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});

assert<
	Equals<
		Static<typeof PutPayoutMethodReqBodyValidator>,
		PutPayoutMethodReqBody
	>
>();

export const PayoutMethodReqBodyValidator = Type.Object({
	bankInfo: Type.Optional(
		Type.Object({
			firstName: Type.String(),
			lastName: Type.String(),
			address1: Type.String(),
			address2: Type.String(),
			city: Type.String(),
			state: Type.String(),
			zip: Type.String(),
			bankRoutingNumber: Type.String(),
			bankAccountNumber: Type.String(),
		}),
	),
	paypalEmail: Type.Optional(Type.String()),
	country: Type.String(),
	entityType: Type.String(),
	usCitizenOrResident: Type.Boolean(),
});

assert<
	Equals<Static<typeof PayoutMethodReqBodyValidator>, PayoutMethodReqBody>
>();

export const DeletePayoutMethodReqBodyValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});

assert<
	Equals<
		Static<typeof DeletePayoutMethodReqBodyValidator>,
		DeletePayoutMethodReqBody
	>
>();

export const UpdatePayoutScheduleReqBodyValidator = Type.Object({
	mode: Type.String(),
	threshold: Type.Optional(Type.Number()),
});

assert<
	Equals<
		Static<typeof UpdatePayoutScheduleReqBodyValidator>,
		UpdatePayoutScheduleReqBody
	>
>();
