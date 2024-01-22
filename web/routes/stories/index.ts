import { SubscriptionStatus } from "@prisma/client";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../common/validators/validation.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import {
	StoriesRespBody,
	StoryCreateReqBody,
	StoryFeedRespBody,
	StoryRespBody,
} from "./schemas.js";
import { StoryCreateReqBodyValidator } from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	// Get all stories
	fastify.get<{ Querystring: PageQuery; Reply: StoriesRespBody }>(
		"/",
		{
			schema: { querystring: PageQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			const profile = (await session.getProfile(prisma))!;
			const total = await prisma.story.count({
				where: { profileId: profile.id },
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const [stories, storyComments, storyLikes] = await Promise.all([
				prisma.story.findMany({
					where: { profileId: profile.id },
					include: {
						_count: {
							select: {
								storyComments: true,
								storyLikes: true,
							},
						},
						storyComments: true,
						storyLikes: true,
						storyMedias: {
							include: {
								upload: true,
							},
						},
					},
					skip: (page - 1) * size,
					take: size,
				}),
				prisma.storyComment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
				prisma.storyLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
			]);

			const result: StoriesRespBody = {
				stories: stories.map((s) =>
					ModelConverter.toIStory(s, {
						isCommented: storyComments
							.map((sc) => sc.storyId)
							.includes(s.id),
						isLiked: storyLikes
							.map((sm) => sm.storyId)
							.includes(s.id),
					}),
				),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	// Get a story with ID
	fastify.get<{ Params: IdParams; Reply: StoryRespBody }>(
		"/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id: storyId } = request.params;
			const session = request.session!;

			const row = await prisma.story.findFirst({
				where: { id: BigInt(storyId) },
				include: {
					storyMedias: {
						include: {
							upload: true,
						},
					},
					_count: {
						select: { storyComments: true, storyLikes: true },
					},
				},
			});
			if (!row) return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));

			await prisma.storyViewer.create({
				data: {
					creatorId: row.profileId,
					viewerId: BigInt(session.userId),
				},
			});

			const result: StoryRespBody = ModelConverter.toIStory(row, {
				isCommented:
					(await prisma.storyComment.count({
						where: {
							userId: BigInt(session.userId),
							storyId: BigInt(storyId),
						},
					})) > 0,
				isLiked:
					(await prisma.storyLike.count({
						where: {
							userId: BigInt(session.userId),
							storyId: BigInt(storyId),
						},
					})) > 0,
			});
			return reply.status(200).send(result);
		},
	);

	// Create new story
	fastify.post<{ Body: StoryCreateReqBody; Reply: StoryRespBody }>(
		"/",
		{
			schema: {
				body: StoryCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { mediaIds } = request.body;

			const storyCount = await prisma.story.count({
				where: { profileId: profile.id },
			});

			if (storyCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const created = await prisma.story.create({
				data: {
					id: snowflake.gen(),
					profileId: profile.id,
					isHighlight: false,
					storyMedias: {
						createMany: {
							data: mediaIds.map((mediaId) => ({
								id: snowflake.gen(),
								uploadId: BigInt(mediaId),
							})),
						},
					},
				},
				include: {
					storyMedias: {
						include: {
							upload: true,
						},
					},
				},
			});

			await prisma.storyViewer.deleteMany({
				where: {
					creatorId: BigInt(session.userId),
				},
			});

			const result: StoryRespBody = ModelConverter.toIStory(created);
			return reply.status(201).send(result);
		},
	);

	// Archive story
	fastify.put<{ Params: IdParams }>(
		"/archive/:id",
		{
			schema: {
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id: storyId } = request.params;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;

			await prisma.story.update({
				where: { id: BigInt(storyId), profileId: profile.id },
				data: { isArchived: true },
			});
			return reply.send();
		},
	);

	// Delete story
	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.params;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			await prisma.story.delete({
				where: { id: BigInt(id), profileId: profile.id },
			});
			return reply.send();
		},
	);

	// loading story creator for Homepage feed
	fastify.get<{ Querystring: PageQuery; Reply: StoryFeedRespBody }>(
		"/feed",
		{
			schema: {
				querystring: PageQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;

			const [paymentSubscriptions, hiddenStories] = await Promise.all([
				prisma.paymentSubscription.findMany({
					where: {
						userId: BigInt(session.userId),
						OR: [
							{
								status: SubscriptionStatus.Active,
							},
							{
								endDate: {
									gte: new Date(),
								},
							},
						],
					},
				}),
				prisma.hiddenStory.findMany({
					where: {
						userId: BigInt(session.userId),
					},
				}),
			]);

			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);

			const subscribedCreatorIds = paymentSubscriptions.map(
				(ps) => ps.creatorId,
			);

			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);
			const total = await prisma.profile.count({
				where: {
					id: { in: subscribedCreatorIds },
					stories: {
						some: {
							id: { notIn: hiddenStoryIds },
							updatedAt: { gt: oneDayBefore },
						},
					},
				},
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const [rows, storyComments, storyLikes] = await Promise.all([
				prisma.profile.findMany({
					where: {
						id: { in: subscribedCreatorIds },
						stories: {
							some: {
								id: { notIn: hiddenStoryIds },
								updatedAt: { gt: oneDayBefore },
							},
						},
					},
					include: {
						stories: {
							where: {
								id: { notIn: hiddenStoryIds },
								updatedAt: { gt: oneDayBefore },
							},
							include: {
								storyMedias: {
									include: {
										upload: true,
									},
								},
								_count: {
									select: {
										storyComments: true,
										storyLikes: true,
									},
								},
							},
							orderBy: { updatedAt: "asc" },
						},
					},
					take: size,
					skip: (page - 1) * size,
				}),
				prisma.storyComment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
				prisma.storyLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
			]);

			const result: StoryFeedRespBody = {
				creators: rows.map((row) => ({
					...ModelConverter.toIProfile(row),
					stories: row.stories.map((s) =>
						ModelConverter.toIStory(s, {
							isCommented: storyComments
								.map((sc) => sc.storyId)
								.includes(s.id),
							isLiked: storyLikes
								.map((sm) => sm.storyId)
								.includes(s.id),
						}),
					),
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	// loading story creator for Homepage feed
	fastify.get<{
		Params: IdParams;
		Querystring: PageQuery;
		Reply: StoriesRespBody;
	}>(
		"/feed/:id",
		{
			schema: {
				params: IdParamsValidator,
				querystring: PageQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: userId } = request.params;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;

			const hiddenStories = await prisma.hiddenStory.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyId: true },
			});
			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);

			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const total = await prisma.story.count({
				where: {
					id: { notIn: hiddenStoryIds },
					profile: { userId: BigInt(userId) },
					updatedAt: { gt: oneDayBefore },
				},
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const [rows, storyComments, storyLikes] = await Promise.all([
				prisma.story.findMany({
					where: {
						id: { notIn: hiddenStoryIds },
						profile: { userId: BigInt(userId) },
						updatedAt: { gt: oneDayBefore },
					},
					include: {
						storyMedias: {
							include: {
								upload: true,
							},
						},
						_count: {
							select: {
								storyComments: true,
								storyLikes: true,
							},
						},
					},
					orderBy: { updatedAt: "asc" },
					take: size,
					skip: (page - 1) * size,
				}),
				prisma.storyComment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
				prisma.storyLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
			]);

			const result: StoriesRespBody = {
				stories: rows.map((row) =>
					ModelConverter.toIStory(row, {
						isCommented: storyComments
							.map((sc) => sc.storyId)
							.includes(row.id),
						isLiked: storyLikes
							.map((sm) => sm.storyId)
							.includes(row.id),
					}),
				),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	// Like/Unlike for a story by ID
	// return updated story object
	fastify.post<{ Params: IdParams; Reply: StoryRespBody }>(
		"/like/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: storyId } = request.params;
			const userId = session.userId;
			const story = await prisma.story.findFirst({
				where: { id: BigInt(storyId) },
			});
			if (!story) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
			}

			const storyLike = await prisma.storyLike.findUnique({
				where: {
					storyId_userId: {
						userId: BigInt(userId),
						storyId: BigInt(storyId),
					},
				},
			});

			if (storyLike) {
				return reply.sendError(APIErrors.ALREADY_LIKE_STORY);
			}

			await prisma.storyLike.create({
				data: {
					storyId: BigInt(storyId),
					userId: BigInt(userId),
				},
			});

			const updatedStory = await prisma.story.findFirst({
				where: { id: BigInt(storyId) },
				include: {
					storyMedias: {
						include: {
							upload: true,
						},
					},
					_count: {
						select: { storyComments: true, storyLikes: true },
					},
				},
			});
			if (!updatedStory) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
			}

			const result: StoryRespBody = ModelConverter.toIStory(
				updatedStory,
				{
					isCommented:
						(await prisma.storyComment.count({
							where: {
								userId: BigInt(session.userId),
								storyId: BigInt(storyId),
							},
						})) > 0,
					isLiked:
						(await prisma.storyLike.count({
							where: {
								userId: BigInt(session.userId),
								storyId: BigInt(storyId),
							},
						})) > 0,
				},
			);
			return reply.status(200).send(result);
		},
	);

	fastify.delete<{ Params: IdParams; Reply: StoryRespBody }>(
		"/like/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: storyId } = request.params;
			const userId = session.userId;
			const story = await prisma.story.findFirst({
				where: { id: BigInt(storyId) },
			});
			if (!story) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
			}

			const storyLike = await prisma.storyLike.findFirst({
				where: {
					userId: BigInt(userId),
					storyId: BigInt(storyId),
				},
			});

			if (!storyLike) {
				return reply.sendError(APIErrors.NOT_LIKE_STORY_YET);
			}

			await prisma.storyLike.delete({
				where: {
					storyId_userId: {
						storyId: BigInt(storyId),
						userId: BigInt(userId),
					},
				},
			});

			const updatedStory = await prisma.story.findFirst({
				where: { id: BigInt(storyId) },
				include: {
					storyMedias: {
						include: {
							upload: true,
						},
					},
					_count: {
						select: { storyComments: true, storyLikes: true },
					},
				},
			});
			if (!updatedStory) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
			}

			const result: StoryRespBody = ModelConverter.toIStory(
				updatedStory,
				{
					isCommented:
						(await prisma.storyComment.count({
							where: {
								userId: BigInt(session.userId),
								storyId: BigInt(storyId),
							},
						})) > 0,
					isLiked:
						(await prisma.storyLike.count({
							where: {
								userId: BigInt(session.userId),
								storyId: BigInt(storyId),
							},
						})) > 0,
				},
			);
			return reply.status(200).send(result);
		},
	);

	fastify.post<{ Params: IdParams; Reply: StoryRespBody }>(
		"/share/:id",
		{
			schema: {
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: storyId } = request.params;
			const story = await prisma.story.findUnique({
				where: { id: BigInt(storyId) },
			});
			if (!story) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
			}

			await prisma.story.update({
				where: { id: BigInt(storyId) },
				data: { shareCount: story.shareCount + 1 },
			});

			const updatedStory = await prisma.story.findUnique({
				where: { id: BigInt(storyId) },
				include: {
					storyMedias: {
						include: {
							upload: true,
						},
					},
					_count: {
						select: {
							storyComments: true,
							storyLikes: true,
						},
					},
				},
			});

			if (!updatedStory) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
			}

			const result: StoryRespBody = ModelConverter.toIStory(
				updatedStory,
				{
					isCommented:
						(await prisma.storyComment.count({
							where: {
								userId: BigInt(session.userId),
								storyId: BigInt(storyId),
							},
						})) > 0,
					isLiked:
						(await prisma.storyLike.count({
							where: {
								userId: BigInt(session.userId),
								storyId: BigInt(storyId),
							},
						})) > 0,
				},
			);
			return reply.status(200).send(result);
		},
	);

	fastify.post<{ Params: IdParams }>(
		"/hide-feed/:id",
		{
			schema: {
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: storyId } = request.params;
			const story = await prisma.story.findUnique({
				where: { id: BigInt(storyId) },
			});
			if (!story) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
			}

			const hiddenStory = await prisma.hiddenStory.findFirst({
				where: {
					userId: BigInt(session.userId),
					storyId: BigInt(storyId),
				},
			});

			if (hiddenStory) {
				return reply.sendError(APIErrors.ALREADY_HIDDEN_STORY);
			}

			await prisma.hiddenStory.create({
				data: {
					userId: BigInt(session.userId),
					storyId: BigInt(storyId),
				},
			});

			return reply.status(200).send();
		},
	);
}
