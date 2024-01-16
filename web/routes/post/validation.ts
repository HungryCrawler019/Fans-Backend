import { PostType } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { assert, Equals } from "tsafe";
import {
	PostArchiveReqBody,
	PostCreateReqBody,
	PostFeedQuery,
	PostFilterQuery,
	PostUpdateReqBody,
	SaveFormReqBody,
	SendInvitationReqBody,
	sortType,
} from "./schemas.js";

export const PostCreateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	type: Type.Enum(PostType),
	caption: Type.String(),
	thumbId: Type.Optional(Type.String()),
	postMedias: Type.Optional(
		Type.Array(
			Type.Object({
				postMediaId: Type.String(),
				tags: Type.Array(
					Type.Object({
						userId: Type.String(),
						pointX: Type.Number(),
						pointY: Type.Number(),
					}),
				),
			}),
		),
	),
	text: Type.Optional(Type.String()),
	taggedPeoples: Type.Optional(
		Type.Array(
			Type.Object({
				userId: Type.String(),
				pointX: Type.Number(),
				pointY: Type.Number(),
			}),
		),
	),
	advanced: Type.Optional(
		Type.Object({
			isHideLikeViewCount: Type.Boolean(),
			isTurnOffComment: Type.Boolean(),
			isPaidLabelDisclaimer: Type.Boolean(),
		}),
	),
	location: Type.Optional(Type.String({ maxLength: 50 })),
	roles: Type.Optional(Type.Array(Type.String())),
	tiers: Type.Optional(Type.Array(Type.String())),
	users: Type.Optional(Type.Array(Type.String())),
	categories: Type.Optional(Type.Array(Type.String())),
	episodeNumber: Type.Optional(Type.Number()),
	description: Type.Optional(Type.String()),
	formIds: Type.Optional(Type.Array(Type.String({ format: "snowflake" }))),
	isPrivate: Type.Optional(Type.Boolean()),
	isNoiseReduction: Type.Optional(Type.Boolean()),
	isAudioLeveling: Type.Optional(Type.Boolean()),
	paidPost: Type.Optional(
		Type.Object({
			price: Type.Number(),
			currency: Type.String(),
			thumbId: Type.Optional(Type.String()),
			tiers: Type.Optional(Type.Array(Type.String())),
			roles: Type.Optional(Type.Array(Type.String())),
			users: Type.Optional(Type.Array(Type.String())),
		}),
	),
	fundraiser: Type.Optional(
		Type.Object({
			title: Type.String(),
			caption: Type.Optional(Type.String()),
			thumbId: Type.Optional(Type.String()),
			price: Type.Number(),
			currency: Type.String(),
			endDate: Type.String(),
			isXpAdd: Type.Boolean(),
		}),
	),
	giveaway: Type.Optional(
		Type.Object({
			prize: Type.String(),
			thumbId: Type.Optional(Type.String()),
			endDate: Type.String(),
			winnerCount: Type.Number(),
			roles: Type.Optional(Type.Array(Type.String())),
		}),
	),
	poll: Type.Optional(
		Type.Object({
			question: Type.String(),
			caption: Type.Optional(Type.String()),
			answers: Type.Array(Type.String()),
			thumbId: Type.Optional(Type.String()),
			endDate: Type.String(),
			isPublic: Type.Boolean(),
			roles: Type.Optional(Type.Array(Type.String())),
		}),
	),
	schedule: Type.Optional(
		Type.Object({
			startDate: Type.String(),
			endDate: Type.Optional(Type.String()),
		}),
	),
});
assert<Equals<Static<typeof PostCreateReqBodyValidator>, PostCreateReqBody>>();

export const PostUpdateReqBodyValidator = Type.Object({
	title: Type.Optional(Type.String()),
	type: Type.Optional(Type.Enum(PostType)),
	caption: Type.Optional(Type.String()),
	thumb: Type.Optional(Type.String()),
	resource: Type.Optional(
		Type.Union([Type.Array(Type.String()), Type.String()]),
	),
	advanced: Type.Optional(
		Type.Object({
			isHideLikeViewCount: Type.Boolean(),
			isTurnOffComment: Type.Boolean(),
			isPaidLabelDisclaimer: Type.Boolean(),
		}),
	),
	location: Type.Optional(Type.String({ maxLength: 50 })),
	roles: Type.Optional(Type.Array(Type.String())),
	categories: Type.Optional(Type.Array(Type.String())),
	startDate: Type.Optional(Type.String()),
	endDate: Type.Optional(Type.String()),
});
assert<Equals<Static<typeof PostUpdateReqBodyValidator>, PostUpdateReqBody>>();

export const PostFilterQueryValidator = Type.Object({
	query: Type.Optional(Type.String()),
	type: Type.Optional(Type.Enum(PostType)),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
	schedule: Type.Optional(Type.Boolean()),
});
assert<Equals<Static<typeof PostFilterQueryValidator>, PostFilterQuery>>();

export const PostFeedQueryValidator = Type.Object({
	sort: Type.Optional(Type.Enum(sortType)),
	page: Type.Optional(Type.Number()),
	size: Type.Optional(Type.Number()),
	categoryId: Type.Optional(Type.String()),
});
assert<Equals<Static<typeof PostFeedQueryValidator>, PostFeedQuery>>();

export const PostArchiveReqBodyValidator = Type.Object({
	id: Type.String({ format: "snowflake" }),
});
assert<
	Equals<Static<typeof PostArchiveReqBodyValidator>, PostArchiveReqBody>
>();

export const SaveFormReqBodyValidator = Type.Object({
	formIds: Type.Array(Type.String({ format: "snowflake" })),
});
assert<Equals<Static<typeof SaveFormReqBodyValidator>, SaveFormReqBody>>();

export const SendInvitationReqBodyValidator = Type.Object({
	emails: Type.Array(Type.String(), { minItems: 1 }),
	message: Type.String(),
});
assert<
	Equals<Static<typeof SendInvitationReqBodyValidator>, SendInvitationReqBody>
>();
