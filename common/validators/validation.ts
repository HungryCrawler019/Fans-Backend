import { FormatRegistry, Static, Type } from "@sinclair/typebox";
import { Format } from "ajv";
import { Equals, assert } from "tsafe";
import {
	DateFilterQueryParams,
	IdParams,
	PageQuery,
	QueryParams,
	QueryWithPageParams,
} from "./schemas.js";

function isSnowflake(value: string) {
	return /^[0-9]{1,20}$/.test(value);
}

export const ajvSnowflakeFormat: Format = isSnowflake;

export function registerFormats() {
	// (0xffffffffffffffffn.toString().length) -> 20
	FormatRegistry.Set("snowflake", isSnowflake);
}

export const IdParamsValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});

assert<Equals<Static<typeof IdParamsValidator>, IdParams>>();

export const QueryParamsValidator = Type.Object({
	query: Type.String(),
});

assert<Equals<Static<typeof QueryParamsValidator>, QueryParams>>();

export const PageQueryValidator = Type.Object({
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});

assert<Equals<Static<typeof PageQueryValidator>, PageQuery>>();

export const QueryWithPageParamsValidator = Type.Object({
	query: Type.Optional(Type.String()),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});

assert<
	Equals<Static<typeof QueryWithPageParamsValidator>, QueryWithPageParams>
>();

export const DateFilterQueryParamsValidator = Type.Object({
	from: Type.Optional(Type.String({ format: "date-time" })),
	to: Type.Optional(Type.String({ format: "date-time" })),
});

assert<
	Equals<Static<typeof DateFilterQueryParamsValidator>, DateFilterQueryParams>
>();
