import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	CodeParams,
	CodeWithDateFilterQueryParams,
	CreateCreatorReferralReqBody,
	CreatorReferralFilterQueryParams,
	CreatorReferralSortType,
	ReferentFilterQueryParams,
	ReferentSortType,
	UpdateCreatorReferralReqBody,
} from "./schemas.js";
import { CreatorReferralTransactionType } from "@prisma/client";

export const CodeWithDateFilterQueryParamsValidator = Type.Object({
	code: Type.Optional(Type.String()),
	from: Type.Optional(Type.String({ format: "date-time" })),
	to: Type.Optional(Type.String({ format: "date-time" })),
});

assert<
	Equals<
		Static<typeof CodeWithDateFilterQueryParamsValidator>,
		CodeWithDateFilterQueryParams
	>
>();

export const ReferentFilterQueryParamsValidator = Type.Object({
	code: Type.Optional(Type.String()),
	from: Type.Optional(Type.String({ format: "date-time" })),
	to: Type.Optional(Type.String({ format: "date-time" })),
	sort: Type.Optional(Type.Enum(ReferentSortType)),
});

assert<
	Equals<
		Static<typeof ReferentFilterQueryParamsValidator>,
		ReferentFilterQueryParams
	>
>();

export const CreatorReferralFilterQueryParamsValidator = Type.Object({
	from: Type.Optional(Type.String({ format: "date-time" })),
	to: Type.Optional(Type.String({ format: "date-time" })),
	sort: Type.Optional(Type.Enum(CreatorReferralSortType)),
});

assert<
	Equals<
		Static<typeof CreatorReferralFilterQueryParamsValidator>,
		CreatorReferralFilterQueryParams
	>
>();

export const CreateCreatorReferralReqBodyValidator = Type.Object({
	code: Type.String({ pattern: "^[a-zA-Z0-9]{1,20}$", maxLength: 20 }),
});

assert<
	Equals<
		Static<typeof CreateCreatorReferralReqBodyValidator>,
		CreateCreatorReferralReqBody
	>
>();

export const UpdateCreatorReferralReqBodyValidator = Type.Object({
	code: Type.String({ pattern: "^[a-zA-Z0-9]{1,20}$", maxLength: 20 }),
});

assert<
	Equals<
		Static<typeof UpdateCreatorReferralReqBodyValidator>,
		UpdateCreatorReferralReqBody
	>
>();

export const CodeParamsValidator = Type.Object({
	code: Type.String({ pattern: "^[a-zA-Z0-9]{1,20}$", maxLength: 20 }),
});

assert<Equals<Static<typeof CodeParamsValidator>, CodeParams>>();
