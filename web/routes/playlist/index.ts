import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import CloudflareStreamService from "../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../common/service/MediaUploadService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../common/validators/validation.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import {
	resolveURLsPostLike,
	resolveURLsUploads,
} from "../../utils/UploadUtils.js";
import {
	PlaylistCreateReqBody,
	PlaylistFilterQuery,
	PlaylistRespBody,
	PlaylistUpdateReqBody,
	PlaylistsRespBody,
} from "./schemas.js";
import {
	PlaylistCreateReqBodyValidator,
	PlaylistFilterQueryValidator,
	PlaylistUpdateReqBodyValidator,
} from "./validation.js";
import { TransactionStatus } from "@prisma/client";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);
	const mediaUpload = await container.resolve(MediaUploadService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.get<{ Querystring: PlaylistFilterQuery }>(
		"/",
		{
			schema: { querystring: PlaylistFilterQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const {
				title = "",
				page = 1,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;

			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const total = await prisma.playlist.count({
				where: {
					title: { contains: title, mode: "insensitive" },
					profileId: profile.id,
				},
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const rows = await prisma.playlist.findMany({
				where: {
					title: { contains: title, mode: "insensitive" },
					profileId: profile.id,
				},
				take: size,
				skip: (page - 1) * size,
				include: {
					thumbMedia: true,
					posts: {
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
					},
					uploads: {
						include: { upload: true },
					},
				},
			});

			await Promise.all(
				rows
					.flatMap((row) => row.posts)
					.map((p) =>
						resolveURLsPostLike(
							p.post,
							cloudflareStream,
							mediaUpload,
						),
					),
			);
			await resolveURLsUploads(
				rows.flatMap((row) => row.uploads).map((p) => p.upload),
				cloudflareStream,
				mediaUpload,
			);

			const result: PlaylistsRespBody = {
				playlists: rows.map((row) => ({
					...ModelConverter.toIPlaylist(row),
					posts: row.posts.map((p) => ModelConverter.toIPost(p.post)),
					uploads: row.uploads.map((p) =>
						ModelConverter.toIUpload(p.upload),
					),
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Params: IdParams }>(
		"/:id",
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
			const profile = await session.getProfile(prisma);
			const { id } = request.params;
			const [row, metadata] = await Promise.all([
				prisma.playlist.findFirst({
					where: { id: BigInt(id) },
					include: {
						thumbMedia: true,
						posts: {
							include: {
								post: {
									include: {
										thumbMedia: true,
										postMedias: {
											include: {
												upload: true,
											},
										},
										_count: {
											select: {
												bookmarks: true,
												postLikes: true,
												comments: true,
											},
										},
										profile: true,
										roles: true,
										tiers: true,
										users: true,
									},
								},
							},
						},
						uploads: {
							include: { upload: true },
						},
					},
				}),
				prisma.playlist.findFirst({
					where: { id: BigInt(id) },
					include: {
						posts: {
							include: {
								post: {
									include: {
										postMedias: {
											include: {
												upload: true,
											},
										},
										_count: {
											select: {
												bookmarks: {
													where: {
														userId: BigInt(
															session.userId,
														),
													},
												},
												postLikes: {
													where: {
														userId: BigInt(
															session.userId,
														),
													},
												},
												comments: {
													where: {
														userId: BigInt(
															session.userId,
														),
													},
												},
											},
										},
										paidPost: {
											where: {
												PaidPostTransaction: {
													some: {
														userId: BigInt(
															session.userId,
														),
														status: TransactionStatus.Successful,
													},
												},
											},
											include: {
												PaidPostTransaction: {
													where: {
														userId: BigInt(
															session.userId,
														),
														status: TransactionStatus.Successful,
													},
												},
											},
										},
									},
								},
							},
						},
						uploads: {
							include: { upload: true },
						},
					},
				}),
			]);
			if (!row)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Playlist"));

			const result: PlaylistRespBody = {
				...ModelConverter.toIPlaylist(row),
				posts: row.posts.map((p) => ({
					...ModelConverter.toIPost(p.post, {
						isBookmarked: metadata?.posts.find(
							(m) => m.postId === p.postId,
						)
							? metadata.posts.find((m) => m.postId === p.postId)!
									.post._count.bookmarks > 0
							: false,
						isCommented: metadata?.posts.find(
							(m) => m.postId === p.postId,
						)
							? metadata.posts.find((m) => m.postId === p.postId)!
									.post._count.comments > 0
							: false,
						isLiked: metadata?.posts.find(
							(m) => m.postId === p.postId,
						)
							? metadata.posts.find((m) => m.postId === p.postId)!
									.post._count.postLikes > 0
							: false,
						isPaidOut:
							metadata?.posts.find(
								(m) => m.postId === p.postId,
							) &&
							metadata?.posts.find((m) => m.postId === p.postId)
								?.post.paidPost
								? metadata?.posts.find(
										(m) => m.postId === p.postId,
								  )!.post.paidPost!.PaidPostTransaction.length >
								  0
								: false,
						isSelf: p.post.profileId === profile?.id,
						isExclusive:
							p.post.roles.length > 0 ||
							p.post.tiers.length > 0 ||
							p.post.users.length > 0,
					}),
					profile: ModelConverter.toIProfile(p.post.profile),
				})),
				uploads: row.uploads.map((p) =>
					ModelConverter.toIUpload(p.upload),
				),
			};

			// Increase the view count of playlist
			await prisma.playlist.update({
				where: { id: BigInt(id) },
				data: {
					viewCount: row.viewCount + 1,
				},
			});

			return reply.send(result);
		},
	);

	fastify.post<{ Body: PlaylistCreateReqBody }>(
		"/",
		{
			schema: {
				body: PlaylistCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const data = request.body;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;

			const playlistCount = await prisma.playlist.count({
				where: { profileId: profile.id },
			});

			if (playlistCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const created = await prisma.playlist.create({
				data: {
					id: snowflake.gen(),
					title: data.title,
					description: data.description,
					thumb: "",
					thumbId: BigInt(data.thumbId),
					isPrivate: data.isPrivate,
					profileId: profile.id,
					posts:
						data.posts.length > 0
							? {
									createMany: {
										data: data.posts.map((p) => ({
											id: snowflake.gen(),
											postId: BigInt(p),
										})),
									},
							  }
							: undefined,
				},
				include: {
					thumbMedia: true,
					posts: {
						include: {
							post: {
								include: {
									thumbMedia: true,
									postMedias: {
										include: {
											upload: true,
										},
									},
									_count: {
										select: {
											bookmarks: true,
											postLikes: true,
											comments: true,
										},
									},
								},
							},
						},
					},
					uploads: {
						include: { upload: true },
					},
				},
			});

			await Promise.all(
				created.posts.map((p) =>
					resolveURLsPostLike(p.post, cloudflareStream, mediaUpload),
				),
			);

			const result: PlaylistRespBody = {
				...ModelConverter.toIPlaylist(created),
				posts: created.posts.map((p) => ModelConverter.toIPost(p.post)),
				uploads: created.uploads.map((p) =>
					ModelConverter.toIUpload(p.upload),
				),
			};
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: PlaylistUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: PlaylistUpdateReqBodyValidator,
				params: IdParamsValidator,
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
			const { id } = request.params;

			const data = request.body;
			const row = await prisma.playlist.findFirst({
				where: { id: BigInt(id), profileId: profile.id },
				include: {
					posts: true,
				},
			});
			if (!row)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Playlist"));

			const postIds = row.posts.map((p) => p.postId.toString());
			let postsToAdd: string[] = [];
			let postsToRemove: string[] = [];

			if (data.posts && data.posts.length > 0) {
				postsToAdd = data.posts.filter((p) => !postIds.includes(p));
				postsToRemove = postIds.filter((p) => !data.posts?.includes(p));
			}
			await prisma.playlist.update({
				where: { id: BigInt(id) },
				data: {
					title: data.title ?? undefined,
					description: data.description ?? undefined,
					thumb: data.thumbId ?? undefined,
					thumbId: data.thumbId ? BigInt(data.thumbId) : undefined,
					isPrivate: data.isPrivate ?? undefined,
					posts: {
						deleteMany:
							postsToRemove.length > 0
								? postsToRemove.map((p) => ({
										postId: BigInt(p),
								  }))
								: undefined,
						createMany:
							postsToAdd.length > 0
								? {
										data: postsToAdd.map((p) => ({
											id: snowflake.gen(),
											postId: BigInt(p),
										})),
								  }
								: undefined,
					},
				},
			});
			return reply.status(200);
		},
	);

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

			const playlist = await prisma.playlist.findFirst({
				where: {
					id: BigInt(id),
					profileId: profile.id,
				},
			});
			if (!playlist)
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Playlist"));

			await prisma.playlist.delete({
				where: { id: BigInt(id) },
			});

			return reply.status(202);
		},
	);
}
