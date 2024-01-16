import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	PollUpdateReqBody,
	VetoPollReqBody,
	VotePollReqBody,
} from "./schemas.js";

export const PollUpdateReqBodyValidator = Type.Object({
	question: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	answers: Type.Optional(Type.Array(Type.String())),
	thumb: Type.Optional(Type.String()),
	endDate: Type.Optional(Type.String()),
	isPublic: Type.Optional(Type.Boolean()),
	roles: Type.Optional(Type.Array(Type.String())),
});

assert<Equals<Static<typeof PollUpdateReqBodyValidator>, PollUpdateReqBody>>();

export const VotePollReqBodyValidator = Type.Object({
	pollId: Type.String(),
	answerId: Type.String(),
});

assert<Equals<Static<typeof VotePollReqBodyValidator>, VotePollReqBody>>();

export const VetoPollReqBodyValidator = Type.Object({
	pollId: Type.String(),
	answerId: Type.String(),
});

assert<Equals<Static<typeof VetoPollReqBodyValidator>, VetoPollReqBody>>();
