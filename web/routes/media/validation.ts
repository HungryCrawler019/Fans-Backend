import { UploadType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { Equals, assert } from "tsafe";
import {
	FinishUploadReqBody,
	GeneratePresignedUrlReqBody,
	MediaTypeParam,
	MediaUploadReqBody,
	PostMediaPageQuery,
	TusUploadReqBody,
} from "./schemas.js";

export const MediaUploadReqBodyValidator = Type.Object({
	type: Type.String(),
});
assert<
	Equals<Static<typeof MediaUploadReqBodyValidator>, MediaUploadReqBody>
>();

export const MediaTypeParamValidator = Type.Object({
	type: Type.Enum(UploadType),
});
assert<Equals<Static<typeof MediaTypeParamValidator>, MediaTypeParam>>();

export const GeneratePresignedUrlReqBodyValidator = Type.Object({
	origin: Type.Optional(Type.String()),
	usage: Type.Optional(Type.String()),
});
assert<
	Equals<
		Static<typeof GeneratePresignedUrlReqBodyValidator>,
		GeneratePresignedUrlReqBody
	>
>();

export const TusUploadReqBodyValidator = Type.Object({
	usage: Type.Optional(Type.String()),
});
assert<Equals<Static<typeof TusUploadReqBodyValidator>, TusUploadReqBody>>();

export const FinishUploadReqBodyValidator = Type.Object({
	isSuccess: Type.Boolean(),
});
assert<
	Equals<Static<typeof FinishUploadReqBodyValidator>, FinishUploadReqBody>
>();

export const PostMediaPageQueryValidator = Type.Object({
	type: Type.Optional(Type.Enum(UploadType)),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
});
assert<
	Equals<Static<typeof PostMediaPageQueryValidator>, PostMediaPageQuery>
>();
