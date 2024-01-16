import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { StoryCreateReqBody } from "./schemas.js";

export const StoryCreateReqBodyValidator = Type.Object({
	mediaIds: Type.Array(Type.String(), { minItems: 1 }),
});

assert<
	Equals<Static<typeof StoryCreateReqBodyValidator>, StoryCreateReqBody>
>();
