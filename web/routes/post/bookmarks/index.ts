import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";
import CloudflareStreamService from "../../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../../common/service/MediaUploadService.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import APIErrors from "../../../errors/index.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import { resolveURLsPostLike } from "../../../utils/UploadUtils.js";
import {
	BookmarkIdsRespBody,
	BookmarksFilterQuery,
	BookmarksRespBody,
} from "./schemas.js";
import { BookmarksFilterQueryValidator } from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const mediaUpload = await container.resolve(MediaUploadService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	// Set bookmark of post to current user
	fastify.post<{ Params: IdParams }>(
		"/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { id: postId } = request.params;
			const session = request.session!;

			const bookmark = await prisma.bookmark.findFirst({
				where: {
					postId: BigInt(postId),
					userId: BigInt(session.userId),
				},
			});

			if (bookmark) {
				return reply.sendError(APIErrors.ALREADY_BOOKMARK_POST);
			}

			const bookmarkCount = await prisma.bookmark.count({
				where: {
					userId: BigInt(session.userId),
				},
			});

			if (bookmarkCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			await prisma.bookmark.create({
				data: {
					userId: BigInt(session.userId),
					postId: BigInt(postId),
				},
			});

			const updatedPost = await prisma.post.findUnique({
				where: { id: BigInt(postId) },
				include: {
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					_count: {
						select: {
							bookmarks: true,
						},
					},
				},
			});

			if (!updatedPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			await resolveURLsPostLike(
				updatedPost,
				cloudflareStream,
				mediaUpload,
			);

			const result: BookmarkIdsRespBody = {
				updatedPost: ModelConverter.toIPost(updatedPost, {
					isBookmarked:
						(await prisma.bookmark.count({
							where: {
								userId: BigInt(session.userId),
								postId: BigInt(postId),
							},
						})) > 0,
				}),
			};
			return reply.send(result);
		},
	);

	// Unset bookmark of post to current user
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
			const { id: postId } = request.params;
			const session = request.session!;

			const bookmark = await prisma.bookmark.findFirst({
				where: {
					postId: BigInt(postId),
					userId: BigInt(session.userId),
				},
			});

			if (!bookmark) {
				return reply.sendError(APIErrors.NOT_BOOKMARK_POST_YET);
			}

			const bookmarkCount = await prisma.bookmark.count({
				where: {
					userId: BigInt(session.userId),
				},
			});

			if (bookmarkCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			await prisma.bookmark.delete({
				where: {
					userId_postId: {
						userId: BigInt(session.userId),
						postId: BigInt(postId),
					},
				},
			});

			const updatedPost = await prisma.post.findUnique({
				where: { id: BigInt(postId) },
				include: {
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					_count: {
						select: { bookmarks: true },
					},
				},
			});

			if (!updatedPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			await resolveURLsPostLike(
				updatedPost,
				cloudflareStream,
				mediaUpload,
			);

			const result: BookmarkIdsRespBody = {
				updatedPost: ModelConverter.toIPost(updatedPost, {
					isBookmarked:
						(await prisma.bookmark.count({
							where: {
								userId: BigInt(session.userId),
								postId: BigInt(postId),
							},
						})) > 0,
				}),
			};
			return reply.send(result);
		},
	);

	// get all bookmarks of current user
	fastify.get<{ Querystring: BookmarksFilterQuery }>(
		"/",
		{
			schema: { querystring: BookmarksFilterQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const {
				query,
				type,
				page = 1,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;
			const total = await prisma.bookmark.count({
				where: {
					userId: BigInt(session.userId),
					post: {
						type: type ?? undefined,
						OR: query
							? [
									{
										title: {
											contains: query,
											mode: "insensitive",
										},
									},
									{
										caption: {
											contains: query,
											mode: "insensitive",
										},
									},
							  ]
							: undefined,
					},
				},
				orderBy: { updatedAt: "desc" },
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const bookmarks = await prisma.bookmark.findMany({
				where: {
					userId: BigInt(session.userId),
					post: {
						type: type ?? undefined,
						OR: query
							? [
									{
										title: {
											contains: query,
											mode: "insensitive",
										},
									},
									{
										caption: {
											contains: query,
											mode: "insensitive",
										},
									},
							  ]
							: undefined,
					},
				},
				include: {
					post: {
						include: {
							thumbMedia: true,
							postMedias: {
								include: { upload: true },
							},
						},
					},
				},
				orderBy: {
					updatedAt: "desc",
				},
				take: size,
				skip: (page - 1) * size,
			});

			await Promise.all(
				bookmarks.map((b) =>
					resolveURLsPostLike(b.post, cloudflareStream, mediaUpload),
				),
			);

			const result: BookmarksRespBody = {
				bookmarks: bookmarks.map((b) => ({
					...ModelConverter.toIBookmark(b),
					post: ModelConverter.toIPost(b.post),
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);
}
