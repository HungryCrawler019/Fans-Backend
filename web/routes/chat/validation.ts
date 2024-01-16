import { Static, Type } from "@sinclair/typebox";
import { Equals, assert } from "tsafe";
import {
	ChatConversationMessagesPostReqBody,
	ChatConversationMessagesQuery,
	ChatFansListReqParams,
	ChatIdParams,
	ChatPaginatedQuery,
	ChatUserIdParams,
	ChatNoteReqBody,
	ChatAutomatedMessageWelcomeReqBody,
} from "./schemas.js";

export const ChatPaginatedQueryValidator = Type.Object({
	page: Type.Number({
		minimum: 1,
		default: 1,
	}),
	itemsPerPage: Type.Number({
		minimum: 1,
		maximum: 1000,
		default: 100,
	}),
});

assert<
	Equals<Static<typeof ChatPaginatedQueryValidator>, ChatPaginatedQuery>
>();

export const ChatIdParamsValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});

assert<Equals<Static<typeof ChatIdParamsValidator>, ChatIdParams>>();

export const ChatUserIdParamsValidator = Type.Object({
	userId: Type.String({ format: "snowflake" }),
});

assert<Equals<Static<typeof ChatUserIdParamsValidator>, ChatUserIdParams>>();

export const ChatConversationMessagesQueryValidator = Type.Object({
	limit: Type.Number({
		minimum: 1,
		maximum: 100,
		default: 100,
	}),
	before: Type.Optional(Type.String()),
	after: Type.Optional(Type.String()),
});

assert<
	Equals<
		Static<typeof ChatConversationMessagesQueryValidator>,
		ChatConversationMessagesQuery
	>
>();

export const ChatConversationMessagesPostReqBodyValidator = Type.Object({
	messageType: Type.Optional(
		Type.Number({
			minimum: 0,
			maximum: 2,
			default: 0,
		}),
	),
	content: Type.String({
		maxLength: 1000,
	}),
	uploadIds: Type.Optional(
		Type.Array(Type.String({ format: "snowflake" }), {
			maxItems: 4,
		}),
	),
});

assert<
	Equals<
		Static<typeof ChatConversationMessagesPostReqBodyValidator>,
		ChatConversationMessagesPostReqBody
	>
>();

export const ChatFansListReqParamsValidator = Type.Object({
	category: Type.Number(),
	limit: Type.Number(),
});

assert<
	Equals<Static<typeof ChatFansListReqParamsValidator>, ChatFansListReqParams>
>();

export const ChatNoteReqBodyValidator = Type.Object({
	note: Type.String({
		maxLength: 60,
	}),
});

assert<Equals<Static<typeof ChatNoteReqBodyValidator>, ChatNoteReqBody>>();

export const ChatAutomatedMessageWelcomeReqBodyValidator = Type.Object({
	text: Type.String({
		maxLength: 1000,
	}),
	image: Type.Optional(Type.String()),
	enabled: Type.Boolean(),
});

assert<
	Equals<
		Static<typeof ChatAutomatedMessageWelcomeReqBodyValidator>,
		ChatAutomatedMessageWelcomeReqBody
	>
>();
