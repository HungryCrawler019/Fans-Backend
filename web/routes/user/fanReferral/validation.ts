import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	ActiveLinkSortType,
	ActiveLinksPageQueryParams,
	CodeParams,
	CreateFanReferralReqBody,
	LinkPerformanceQueryParams,
	LinkPerformanceSortType,
	TransactionSortType,
	TransactionsQueryParams,
	UpdateFanReferralReqBody,
} from "./schemas.js";

export const ActiveLinksPageQueryParamsValidator = Type.Object({
	sort: Type.Optional(Type.Enum(ActiveLinkSortType)),
	query: Type.Optional(Type.String()),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});

assert<
	Equals<
		Static<typeof ActiveLinksPageQueryParamsValidator>,
		ActiveLinksPageQueryParams
	>
>();

export const CreateFanReferralReqBodyValidator = Type.Object({
	profileId: Type.String(),
	code: Type.Optional(
		Type.String({ pattern: "^[a-zA-Z0-9]{1,20}$", maxLength: 20 }),
	),
});

assert<
	Equals<
		Static<typeof CreateFanReferralReqBodyValidator>,
		CreateFanReferralReqBody
	>
>();

export const UpdateFanReferralReqBodyValidator = Type.Object({
	code: Type.String({ pattern: "^[a-zA-Z0-9]{1,20}$", maxLength: 20 }),
});

assert<
	Equals<
		Static<typeof UpdateFanReferralReqBodyValidator>,
		UpdateFanReferralReqBody
	>
>();

export const TransactionsQueryParamsValidator = Type.Object({
	sort: Type.Optional(Type.Enum(TransactionSortType)),
	query: Type.Optional(Type.String()),
	from: Type.Optional(Type.String({ format: "date-time" })),
	to: Type.Optional(Type.String({ format: "date-time" })),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});

assert<
	Equals<
		Static<typeof TransactionsQueryParamsValidator>,
		TransactionsQueryParams
	>
>();

export const LinkPerformanceQueryParamsValidator = Type.Object({
	sort: Type.Optional(Type.Enum(LinkPerformanceSortType)),
	query: Type.Optional(Type.String()),
	from: Type.Optional(Type.String({ format: "date-time" })),
	to: Type.Optional(Type.String({ format: "date-time" })),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});

assert<
	Equals<
		Static<typeof LinkPerformanceQueryParamsValidator>,
		LinkPerformanceQueryParams
	>
>();

export const CodeParamsValidator = Type.Object({
	code: Type.String({ pattern: "^[a-zA-Z0-9]{1,20}$", maxLength: 20 }),
});

assert<Equals<Static<typeof CodeParamsValidator>, CodeParams>>();
