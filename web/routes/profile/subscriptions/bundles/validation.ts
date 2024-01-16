import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { BundleCreateBody, BundleUpdateBody } from "./schemas.js";

export const BundleCreateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	month: Type.Number(),
	discount: Type.Number(),
	limit: Type.Optional(Type.Number()),
	roles: Type.Optional(Type.Array(Type.String())),
});

assert<Equals<Static<typeof BundleCreateReqBodyValidator>, BundleCreateBody>>();

export const BundleUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	month: Type.Optional(Type.Number()),
	discount: Type.Optional(Type.Number()),
	limit: Type.Optional(Type.Number()),
});

assert<Equals<Static<typeof BundleUpdateReqBodyValidator>, BundleUpdateBody>>();
