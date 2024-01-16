import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import { SendMessageReqBody } from "./schemas.js";

export const SendMessageReqBodyValidator = Type.Object({
	name: Type.Required(Type.String()),
	email: Type.Required(Type.String({ format: "email" })),
	subject: Type.Required(Type.String()),
	question: Type.Required(Type.String()),
});

assert<
	Equals<Static<typeof SendMessageReqBodyValidator>, SendMessageReqBody>
>();
