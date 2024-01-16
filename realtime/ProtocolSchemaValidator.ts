import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const PayloadPongDataValidator = TypeCompiler.Compile(Type.Integer());

export const PayloadPingDataValidator = TypeCompiler.Compile(Type.Integer());

export const PayloadStartSessionDataValidator = TypeCompiler.Compile(
	Type.Object({
		token: Type.String(),
		apiVersion: Type.Integer(),
		appVersion: Type.Optional(Type.String()),
		platform: Type.Optional(Type.String()),
	}),
);
