import CloudflareStreamService from "../../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../../common/service/MediaUploadService.js";
import NotificationService from "../../../../common/service/NotificationService.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { NotificationType } from "../../../CommonAPISchemas.js";
import APIErrors from "../../../errors/index.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import { resolveURLsPostLike } from "../../../utils/UploadUtils.js";
import {
	CommentCreateReqBody,
	CommentRespBody,
	CommentUpdateReqBody,
	RepliesRespBody,
} from "./schemas.js";
import {
	CommentCreateReqBodyValidator,
	CommentUpdateReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const notification = await container.resolve(NotificationService);
	const mediaUpload = await container.resolve(MediaUploadService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);

	fastify.post<{ Body: CommentCreateReqBody }>(
		"/",
		{
			schema: { body: CommentCreateReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const data = request.body;
			const session = request.session!;

			const post = await prisma.post.findUnique({
				where: { id: BigInt(data.postId) },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}
			if (data.parentCommentId) {
				const parentComment = await prisma.comment.findUnique({
					where: { id: BigInt(data.parentCommentId) },
				});
				if (!parentComment) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Parent Comment"),
					);
				}
			}

			const hiddenStories = await prisma.hiddenStory.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyId: true },
			});
			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);
			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const created = await prisma.comment.create({
				data: {
					id: snowflake.gen(),
					userId: BigInt(session.userId),
					postId: BigInt(data.postId),
					parentCommentId: data.parentCommentId
						? BigInt(data.parentCommentId)
						: undefined,
					content: data.content,
				},
				include: {
					post: {
						include: {
							profile: {
								include: {
									user: {
										include: {
											notificationsSettings: true,
										},
									},
								},
							},
						},
					},
					parentComment: {
						include: {
							user: {
								include: {
									notificationsSettings: true,
								},
							},
						},
					},
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
				},
			});

			const updatedPost = await prisma.post.findFirst({
				where: { id: BigInt(data.postId) },
				include: {
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					_count: {
						select: {
							comments: true,
						},
					},
				},
			});

			if (created.parentComment) {
				if (
					created.parentComment.user.notificationsSettings
						?.replyCommentInApp &&
					created.parentComment.userId !== BigInt(session.userId)
				)
					notification.createNotification(
						created.parentComment.userId,
						{
							type: NotificationType.ReplyComment,
							users: [created.userId],
							post: created.postId,
							comment: created.id,
						},
					);

				if (
					created.post.profile.user?.notificationsSettings
						?.replyCommentInApp &&
					created.parentComment.userId !==
						created.post.profile.userId &&
					created.post.profile.userId !== BigInt(session.userId)
				) {
					notification.createNotification(
						created.post.profile.userId,
						{
							type: NotificationType.ReplyComment,
							users: [created.userId],
							post: created.postId,
							comment: created.id,
						},
					);
				}
			} else if (
				created.post.profile.user?.notificationsSettings
					?.commentCreatorInApp &&
				created.post.profile.userId !== BigInt(session.userId)
			) {
				notification.createNotification(created.post.profile.userId, {
					type: NotificationType.MadeComment,
					users: [created.userId],
					post: created.postId,
					comment: created.id,
				});
			}

			if (!updatedPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			const commentCountOfProfile = await prisma.comment.count({
				where: {
					post: {
						profileId: updatedPost.profileId,
						isPosted: true,
					},
				},
			});

			await prisma.profile.update({
				where: { id: updatedPost.profileId },
				data: { commentCount: commentCountOfProfile },
			});

			await resolveURLsPostLike(
				updatedPost,
				cloudflareStream,
				mediaUpload,
			);

			const result: CommentRespBody = {
				...ModelConverter.toIComment(created),
				post: ModelConverter.toIPost(updatedPost, {
					isCommented:
						(await prisma.comment.count({
							where: {
								userId: BigInt(session.userId),
								postId: created.postId,
							},
						})) > 0,
				}),
				parentComment: created.parentComment
					? ModelConverter.toIComment(created.parentComment)
					: undefined,
				user: {
					...ModelConverter.toIUser(created.user),
					profile: created.user.profile
						? ModelConverter.toIProfile(created.user.profile)
						: undefined,
				},
			};
			return reply.send(result);
		},
	);

	// Get all comments for a post by ID
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
			const { id: postId } = request.params;

			const hiddenStories = await prisma.hiddenStory.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyId: true },
			});
			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);
			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const comments = await prisma.comment.findMany({
				where: { postId: BigInt(postId) },
				// orderBy: { likeCount: "desc" },
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
							commentLikes: true,
							replies: true,
						},
					},
				},
			});

			const commentLikes = await prisma.commentLike.findMany({
				where: { userId: BigInt(session.userId) },
				select: { commentId: true },
			});

			const result: RepliesRespBody = {
				replies: ModelConverter.toIReplies(
					comments.map((c) => ({
						...c,
						metadata: {
							isLiked: commentLikes
								.map((cl) => cl.commentId)
								.includes(c.id),
						},
					})),
				),
			};
			return reply.send(result);
		},
	);

	// Update comment by comment ID
	fastify.put<{ Body: CommentUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: CommentUpdateReqBodyValidator,
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

			const comment = await prisma.comment.findFirst({
				where: { id: BigInt(id), userId: BigInt(session.userId) },
			});
			if (!comment)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Comment"));

			await prisma.comment.update({
				where: { id: BigInt(id) },
				data: { content },
			});
			return reply.status(202);
		},
	);

	// Delete comment by comment ID
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
			const { id: commentId } = request.params;
			const session = request.session!;
			const userId = session.userId;

			const comment = await prisma.comment.findFirst({
				where: { id: BigInt(commentId) },
				include: {
					post: {
						include: { profile: true },
					},
				},
			});

			if (!comment)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Comment"));

			if (
				BigInt(userId) !== comment.post.profile.userId &&
				BigInt(userId) !== comment.userId
			) {
				return reply.sendError(
					APIErrors.NOT_PERMISSION_TO_DELETE_COMMENT,
				);
			}

			await prisma.comment.delete({
				where: { id: BigInt(commentId) },
			});

			const commentCountOfProfile = await prisma.comment.count({
				where: {
					post: {
						profileId: comment.post.profileId,
						isPosted: true,
					},
				},
			});

			await prisma.profile.update({
				where: { id: comment.post.profileId },
				data: { commentCount: commentCountOfProfile },
			});

			return reply.status(202).send({ message: "Comment is removed." });
		},
	);

	// Like/Unlike for a comment by ID
	// return updated comment object
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
			const session = request.session!;
			const { id: commentId } = request.params;
			const userId = session.userId;
			const comment = await prisma.comment.findFirst({
				where: { id: BigInt(commentId) },
			});
			if (!comment) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Comment"));
			}

			const like = await prisma.commentLike.findFirst({
				where: {
					userId: BigInt(userId),
					commentId: BigInt(commentId),
				},
			});

			if (like) {
				return reply.sendError(APIErrors.COMMENT_IS_LIKED_ALREADY);
			} else {
				await prisma.commentLike.create({
					data: {
						commentId: BigInt(commentId),
						userId: BigInt(userId),
					},
				});
			}

			const updatedComment = await prisma.comment.findFirst({
				where: { id: BigInt(commentId) },
				include: {
					parentComment: true,
					_count: {
						select: { commentLikes: true },
					},
				},
			});
			if (!updatedComment) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Comment"));
			}

			const result: CommentRespBody = {
				...ModelConverter.toIComment(updatedComment),
				parentComment: updatedComment.parentComment
					? ModelConverter.toIComment(updatedComment.parentComment)
					: undefined,
			};
			return reply.status(200).send(result);
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
			const session = request.session!;
			const { id: commentId } = request.params;
			const userId = session.userId;
			const comment = await prisma.comment.findFirst({
				where: { id: BigInt(commentId) },
			});
			if (!comment) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Comment"));
			}

			const like = await prisma.commentLike.findFirst({
				where: {
					userId: BigInt(userId),
					commentId: BigInt(commentId),
				},
			});

			if (!like) {
				return reply.sendError(APIErrors.COMMENT_IS_NOT_LIKED_YET);
			} else {
				await prisma.commentLike.delete({
					where: {
						userId_commentId: {
							commentId: BigInt(commentId),
							userId: BigInt(userId),
						},
					},
				});
			}

			const updatedComment = await prisma.comment.findFirst({
				where: { id: BigInt(commentId) },
				include: {
					parentComment: true,
					_count: {
						select: { commentLikes: true },
					},
				},
			});
			if (!updatedComment) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Comment"));
			}

			const result: CommentRespBody = {
				...ModelConverter.toIComment(updatedComment),
				parentComment: updatedComment.parentComment
					? ModelConverter.toIComment(updatedComment.parentComment)
					: undefined,
			};
			return reply.status(200).send(result);
		},
	);
}
