import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	StoryCommentCreateReqBody,
	StoryCommentRespBody,
	StoryCommentUpdateReqBody,
	StoryRepliesRespBody,
} from "./schemas.js";
import {
	StoryCommentCreateReqBodyValidator,
	StoryCommentUpdateReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);

	fastify.post<{ Body: StoryCommentCreateReqBody }>(
		"/",
		{
			schema: { body: StoryCommentCreateReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const data = request.body;
			const session = request.session!;
			try {
				const story = await prisma.story.findUnique({
					where: { id: BigInt(data.storyId) },
				});
				if (!story) {
					return reply.sendError(APIErrors.ITEM_NOT_FOUND("Story"));
				}
				if (data.parentCommentId) {
					const parentComment = await prisma.storyComment.findUnique({
						where: { id: BigInt(data.parentCommentId) },
					});
					if (!parentComment) {
						return reply.sendError(
							APIErrors.ITEM_NOT_FOUND("Parent Story Comment"),
						);
					}
				}

				const created = await prisma.storyComment.create({
					data: {
						id: snowflake.gen(),
						userId: BigInt(session.userId),
						storyId: BigInt(data.storyId),
						parentCommentId: data.parentCommentId
							? BigInt(data.parentCommentId)
							: undefined,
						content: data.content,
					},
					include: {
						story: {
							include: {
								storyMedias: {
									include: {
										upload: true,
									},
								},
							},
						},
						parentComment: true,
					},
				});

				const storyCommentLikes =
					await prisma.storyCommentLike.findMany({
						where: { userId: BigInt(session.userId) },
						select: { storyCommentId: true },
					});

				const result: StoryCommentRespBody = {
					...ModelConverter.toIStoryComment(created),
					story: ModelConverter.toIStory(created.story),
					parentComment: created.parentComment
						? ModelConverter.toIStoryComment(
								created.parentComment,
								{
									isLiked: storyCommentLikes
										.map((scl) => scl.storyCommentId)
										.includes(created.parentComment.id),
								},
						  )
						: undefined,
				};
				return reply.send(result);
			} catch (err) {
				request.log.error(
					err,
					`Error on create comment for story #${data.storyId}`,
				);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Get all story comments for a story by ID
	fastify.get<{ Params: IdParams }>(
		"/reply/:id",
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
			const data = request.body;
			const session = request.session!;
			const { id: storyId } = request.params;
			const hiddenStories = await prisma.hiddenStory.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyId: true },
			});
			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);
			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const storyComments = await prisma.storyComment.findMany({
				where: { storyId: BigInt(storyId) },
				orderBy: { storyCommentLikes: { _count: "desc" } },
				include: {
					user: {
						include: {
							profile: {
								include: {
									stories: {
										where: {
											id: { notIn: hiddenStoryIds },
											profile: {
												userId: BigInt(session.userId),
											},
											updatedAt: { gt: oneDayBefore },
										},
										include: {
											storyMedias: {
												include: { upload: true },
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
							},
						},
					},
					_count: {
						select: {
							storyCommentLikes: true,
							replies: true,
						},
					},
				},
			});

			const storyCommentLikes = await prisma.storyCommentLike.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyCommentId: true },
			});
			const result: StoryRepliesRespBody = {
				replies: ModelConverter.toIStoryReplies(
					storyComments.map((sc) => ({
						...sc,
						metadata: {
							isLiked: storyCommentLikes
								.map((scl) => scl.storyCommentId)
								.includes(sc.id),
						},
					})),
				),
			};
			return reply.send(result);
		},
	);

	// Update story comment by story comment ID
	fastify.put<{ Body: StoryCommentUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: StoryCommentUpdateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id } = request.params;
			const { content } = request.body;
			try {
				const storyComment = await prisma.storyComment.findFirst({
					where: { id: BigInt(id), userId: BigInt(session.userId) },
				});
				if (!storyComment) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Story Comment"),
					);
				}

				await prisma.storyComment.update({
					where: { id: BigInt(id) },
					data: { content },
				});
				return reply.status(202).send();
			} catch (err) {
				request.log.error(err, `Error on update story comment #${id}`);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Delete story comment by story comment ID
	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id: storyCommentId } = request.params;
				const session = request.session!;
				const userId = session.userId;

				const storyComment = await prisma.storyComment.findFirst({
					where: { id: BigInt(storyCommentId) },
					include: {
						story: {
							include: { profile: true },
						},
					},
				});

				if (!storyComment) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Story Comment"),
					);
				}

				if (
					BigInt(userId) !== storyComment.story.profile.userId &&
					BigInt(userId) !== storyComment.userId
				) {
					return reply.sendError(
						APIErrors.NOT_PERMISSION_TO_DELETE_COMMENT,
					);
				}

				await prisma.storyComment.delete({
					where: { id: BigInt(storyCommentId) },
				});
				return reply
					.status(202)
					.send({ message: "Story Comment is removed." });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Like/Unlike for a story comment by ID
	// return updated story comment object
	fastify.post<{ Params: IdParams }>(
		"/like/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const { id: storyCommentId } = request.params;
				const userId = session.userId;
				const comment = await prisma.storyComment.findFirst({
					where: { id: BigInt(storyCommentId) },
					include: { story: true },
				});
				if (!comment) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Story Comment"),
					);
				}

				const storyCommentLike =
					await prisma.storyCommentLike.findFirst({
						where: {
							userId: BigInt(userId),
							storyCommentId: BigInt(storyCommentId),
						},
					});

				if (storyCommentLike) {
					return reply.sendError(APIErrors.COMMENT_IS_LIKED_ALREADY);
				}
				const created = await prisma.storyCommentLike.create({
					data: {
						storyCommentId: BigInt(storyCommentId),
						userId: BigInt(userId),
					},
					include: {
						storyComment: true,
					},
				});

				const updatedStoryComment = await prisma.storyComment.findFirst(
					{
						where: { id: BigInt(storyCommentId) },
						include: {
							_count: {
								select: {
									storyCommentLikes: true,
								},
							},
							story: {
								include: {
									storyMedias: {
										include: {
											upload: true,
										},
									},
								},
							},
							parentComment: {
								include: {
									_count: {
										select: {
											storyCommentLikes: true,
											replies: true,
										},
									},
								},
							},
						},
					},
				);
				if (!updatedStoryComment) {
					return reply.sendError(APIErrors.ITEM_NOT_FOUND("Comment"));
				}

				const storyCommentLikes =
					await prisma.storyCommentLike.findMany({
						where: { userId: BigInt(session.userId) },
						select: { storyCommentId: true },
					});

				const result: StoryCommentRespBody = {
					...ModelConverter.toIStoryComment(updatedStoryComment, {
						isLiked: storyCommentLikes
							.map((scl) => scl.storyCommentId)
							.includes(updatedStoryComment.id),
					}),
					story: ModelConverter.toIStory(updatedStoryComment.story, {
						isLiked:
							(await prisma.storyCommentLike.count({
								where: {
									userId: BigInt(session.userId),
									storyCommentId: BigInt(storyCommentId),
								},
							})) > 0,
					}),
					parentComment: updatedStoryComment.parentComment
						? ModelConverter.toIStoryComment(
								updatedStoryComment.parentComment,
								{
									isLiked: storyCommentLikes
										.map((scl) => scl.storyCommentId)
										.includes(
											updatedStoryComment.parentComment
												.id,
										),
								},
						  )
						: undefined,
				};
				return reply.status(200).send(result);
			} catch (err) {
				console.log(err);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/like/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const { id: storyCommentId } = request.params;
				const userId = session.userId;
				const storyComment = await prisma.storyComment.findFirst({
					where: { id: BigInt(storyCommentId) },
					include: { story: true },
				});
				if (!storyComment) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Story Comment"),
					);
				}

				const storyCommentLike =
					await prisma.storyCommentLike.findFirst({
						where: {
							userId: BigInt(userId),
							storyCommentId: BigInt(storyCommentId),
						},
					});

				if (!storyCommentLike) {
					return reply.sendError(APIErrors.COMMENT_IS_NOT_LIKED_YET);
				} else {
					await prisma.storyCommentLike.delete({
						where: {
							storyCommentId_userId: {
								storyCommentId: BigInt(storyCommentId),
								userId: BigInt(userId),
							},
						},
					});
				}

				const updatedStoryComment = await prisma.storyComment.findFirst(
					{
						where: { id: BigInt(storyCommentId) },
						include: {
							_count: {
								select: {
									storyCommentLikes: true,
								},
							},
							parentComment: true,
							story: {
								include: {
									storyMedias: {
										include: {
											upload: true,
										},
									},
								},
							},
						},
					},
				);
				if (!updatedStoryComment) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Story Comment"),
					);
				}

				const storyCommentLikes =
					await prisma.storyCommentLike.findMany({
						where: { userId: BigInt(session.userId) },
						select: { storyCommentId: true },
					});

				const result: StoryCommentRespBody = {
					...ModelConverter.toIStoryComment(updatedStoryComment, {
						isLiked: storyCommentLikes
							.map((scl) => scl.storyCommentId)
							.includes(updatedStoryComment.id),
					}),
					story: ModelConverter.toIStory(updatedStoryComment.story, {
						isLiked:
							(await prisma.storyCommentLike.count({
								where: {
									userId: BigInt(session.userId),
									storyCommentId: BigInt(storyCommentId),
								},
							})) > 0,
					}),
					parentComment: updatedStoryComment.parentComment
						? ModelConverter.toIStoryComment(
								updatedStoryComment.parentComment,
								{
									isLiked: storyCommentLikes
										.map((scl) => scl.storyCommentId)
										.includes(
											updatedStoryComment.parentComment
												.id,
										),
								},
						  )
						: undefined,
				};
				return reply.status(200).send(result);
			} catch (err) {
				console.log(err);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
