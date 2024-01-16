import { Static, Type } from "@sinclair/typebox";
import { Equals, assert } from "tsafe";
import {
	AuthForgotPasswordReqBody,
	AuthOAuth2AuthorizeReqBody,
	AuthOAuth2AuthorizeReqParams,
	AuthOAuth2LinkReqBody,
	AuthOAuth2LinkReqParams,
	AuthPasswordLoginReqBody,
	AuthPasswordRegisterReqBody,
	AuthPasswordVerifyRegisterReqBody,
	AuthResendReqBody,
	AuthResetPasswordReqBody,
	AuthVerifyCodeReqBody,
} from "./schemas.js";

export const AuthPasswordRegisterReqBodyValidator = Type.Object({
	email: Type.String(),
	username: Type.String(),
});

assert<
	Equals<
		Static<typeof AuthPasswordRegisterReqBodyValidator>,
		AuthPasswordRegisterReqBody
	>
>();

export const AuthPasswordVerifyRegisterReqBodyValidator = Type.Object({
	email: Type.String(),
	code: Type.String(),
	username: Type.String(),
	password: Type.String(),
});

assert<
	Equals<
		Static<typeof AuthPasswordVerifyRegisterReqBodyValidator>,
		AuthPasswordVerifyRegisterReqBody
	>
>();

export const AuthPasswordLoginReqBodyValidator = Type.Object({
	email: Type.String(),
	password: Type.String(),
});

assert<
	Equals<
		Static<typeof AuthPasswordLoginReqBodyValidator>,
		AuthPasswordLoginReqBody
	>
>();

export const AuthOAuth2AuthorizeReqParamsValidator = Type.Object({
	provider: Type.String(),
});

assert<
	Equals<
		Static<typeof AuthOAuth2AuthorizeReqParamsValidator>,
		AuthOAuth2AuthorizeReqParams
	>
>();

export const AuthOAuth2AuthorizeReqBodyValidator = Type.Object({
	code: Type.String(),
	redirectUri: Type.String(),
	codeVerifier: Type.Optional(Type.String()),
});

assert<
	Equals<
		Static<typeof AuthOAuth2AuthorizeReqBodyValidator>,
		AuthOAuth2AuthorizeReqBody
	>
>();

export const AuthOAuth2LinkReqParamsValidator = Type.Object({
	provider: Type.String(),
});

assert<
	Equals<
		Static<typeof AuthOAuth2LinkReqParamsValidator>,
		AuthOAuth2LinkReqParams
	>
>();

export const AuthOAuth2LinkReqBodyValidator = Type.Object({
	code: Type.String(),
	redirectUri: Type.String(),
	codeVerifier: Type.Optional(Type.String()),
});

assert<
	Equals<Static<typeof AuthOAuth2LinkReqBodyValidator>, AuthOAuth2LinkReqBody>
>();

export const AuthForgotPasswordReqBodyValidator = Type.Object({
	email: Type.String(),
});

assert<
	Equals<
		Static<typeof AuthForgotPasswordReqBodyValidator>,
		AuthForgotPasswordReqBody
	>
>();

export const AuthVerifyCodeReqBodyValidator = Type.Object({
	code: Type.String(),
	email: Type.String(),
});

assert<
	Equals<Static<typeof AuthVerifyCodeReqBodyValidator>, AuthVerifyCodeReqBody>
>();

export const AuthResetPasswordReqBodyValidator = Type.Object({
	email: Type.String(),
	password: Type.String(),
});

assert<
	Equals<
		Static<typeof AuthResetPasswordReqBodyValidator>,
		AuthResetPasswordReqBody
	>
>();

export const AuthResendReqBodyValidator = Type.Object({
	email: Type.String(),
	username: Type.Optional(Type.String()),
});
assert<Equals<Static<typeof AuthResendReqBodyValidator>, AuthResendReqBody>>();
