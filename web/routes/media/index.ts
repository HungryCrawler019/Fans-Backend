import {
	TransactionStatus,
	UploadStorageType,
	UploadType,
	UploadUsageType,
} from "@prisma/client";
import type { File, FilesObject } from "fastify-multer/lib/interfaces.js";
import { Logger } from "pino";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import CloudflareStreamService from "../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../common/service/MediaUploadService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService, {
	Session,
} from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { firstParam } from "../../../common/utils/Common.js";
import { IdParams, PageQuery } from "../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../common/validators/validation.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import { checkAccess } from "../../utils/CheckUtils.js";
import {
	deleteUploadFromCDN,
	resolveAuthenticatedMediaURL,
} from "../../utils/UploadUtils.js";
import {
	FinishUploadReqBody,
	GeneratePresignedUrlReqBody,
	MediaRespBody,
	MediaTypeParam,
	MediaUploadRespBody,
	MediasRespBody,
	PostMediaPageQuery,
	PresignedUrlRespBody,
	TusUploadReqBody,
	TusUploadRespBody,
} from "./schemas.js";
import {
	GeneratePresignedUrlReqBodyValidator,
	MediaTypeParamValidator,
	PostMediaPageQueryValidator,
	TusUploadReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);
	const mediaUpload = await container.resolve(MediaUploadService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);
	const prisma = await container.resolve(PrismaService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.post<{ Params: MediaTypeParam }>(
		"/:type",
		{
			schema: { params: MediaTypeParamValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				mediaUpload.getMulter("media").array("media"),
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const files: FilesObject | Partial<File>[] | undefined = (
				(await request) as any
			).files;

			if (!files || !Array.isArray(files)) {
				return reply.sendError(APIErrors.FILE_MISSING);
			}
			const { type } = request.params;
			if (!type) {
				return reply.sendError(APIErrors.ITEM_MISSING("Type"));
			} else if (type !== "Image" && type !== "Audio") {
				return reply.sendError(
					APIErrors.INVALID_REQUEST(
						"Only Image and Audio uploads are supported using this method.",
					),
				);
			}

			// const uploadCount = await prisma.upload.count({
			// 	where: { userId: BigInt(session.userId) },
			// });

			// if (uploadCount >= maxObjectLimit) {
			// 	return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			// }

			await prisma.upload.createMany({
				data: files.map((file: any) => ({
					id: snowflake.gen(),
					userId: BigInt(session.userId),
					type,
					url: file.path,
					origin: file.originalname,
					usage: UploadUsageType.POST,
					storage: UploadStorageType.S3,
				})),
			});

			return reply.status(200).send({
				paths: files.map((file: any) => file.path),
			} as MediaUploadRespBody);
		},
	);

	fastify.get<{ Params: MediaTypeParam; Querystring: PageQuery }>(
		"/:type",
		{
			schema: {
				params: MediaTypeParamValidator,
				querystring: PageQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { type } = request.params;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;

			const session = request.session!;
			const userId = session.userId;
			const total = await prisma.upload.count({
				where: { type, userId: BigInt(userId) },
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}
			const medias = await prisma.upload.findMany({
				where: {
					type,
					userId: BigInt(userId),
					usage: UploadUsageType.POST,
				},
				orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
				take: size,
				skip: (page - 1) * size,
			});

			const result: MediasRespBody = {
				medias: await Promise.all(
					medias.map(async (m) => {
						const url = await resolveAuthenticatedMediaURL(
							m,
							cloudflareStream,
							mediaUpload,
						);
						const media = ModelConverter.toIMedia(m);
						media.url = url;
						return media;
					}),
				),
				page,
				size,
				total,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Querystring: PostMediaPageQuery; Reply: MediasRespBody }>(
		"/post-medias",
		{
			schema: {
				querystring: PostMediaPageQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { page = 1, size = DEFAULT_PAGE_SIZE, type } = request.query;

			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const [imageTotal, videoTotal] = await Promise.all([
				prisma.upload.count({
					where: {
						type: "Image",
						usage: UploadUsageType.POST,
						postMedias: {
							some: {
								post: {
									profileId: profile.id,
									isArchived: false,
									isPosted: true,
								},
							},
						},
					},
				}),
				prisma.upload.count({
					where: {
						type: "Video",
						usage: UploadUsageType.POST,
						postMedias: {
							some: {
								post: {
									profileId: profile.id,
									isArchived: false,
									isPosted: true,
								},
							},
						},
					},
				}),
			]);

			const total =
				type === "Image"
					? imageTotal
					: type === "Video"
					? videoTotal
					: imageTotal + videoTotal;

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const medias = await prisma.upload.findMany({
				where: {
					type: type ?? { in: ["Video", "Image"] },
					usage: UploadUsageType.POST,
					postMedias: {
						some: {
							post: {
								profileId: profile.id,
								isArchived: false,
								isPosted: true,
							},
						},
					},
				},
				orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
				take: size,
				skip: (page - 1) * size,
			});
			const result: MediasRespBody = {
				medias: await Promise.all(
					medias.map(async (m) => {
						const url = await resolveAuthenticatedMediaURL(
							m,
							cloudflareStream,
							mediaUpload,
						);

						const media = ModelConverter.toIMedia(m);
						media.url = url;
						return media;
					}),
				),
				page,
				size,
				total,
				videoTotal,
				imageTotal,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);

	fastify.get<{
		Querystring: PostMediaPageQuery;
		Params: IdParams;
		Reply: MediasRespBody;
	}>(
		"/post-medias/:id",
		{
			schema: {
				querystring: PostMediaPageQueryValidator,
				params: IdParamsValidator,
			},
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			const { id: userId } = request.params;
			const { page = 1, size = DEFAULT_PAGE_SIZE, type } = request.query;

			const profile = await prisma.profile.findFirst({
				where: { userId: BigInt(userId) },
			});
			if (!profile) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Profile"));
			}

			const [imageTotal, videoTotal] = await Promise.all([
				prisma.upload.count({
					where: {
						type: "Image",
						usage: UploadUsageType.POST,
						postMedias: {
							some: {
								post: {
									profileId: profile.id,
									isArchived: false,
									isPosted: true,
								},
							},
						},
					},
				}),
				prisma.upload.count({
					where: {
						type: "Video",
						usage: UploadUsageType.POST,
						postMedias: {
							some: {
								post: {
									profileId: profile.id,
									isArchived: false,
									isPosted: true,
								},
							},
						},
					},
				}),
			]);

			const total =
				type === "Image"
					? imageTotal
					: type === "Video"
					? videoTotal
					: imageTotal + videoTotal;

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}
			const session = request.session!;
			if (session) {
				const hasAccess = session
					? await checkAccess(
							prisma,
							BigInt(session.userId),
							profile.userId,
							profile.id,
					  )
					: false;

				if (!hasAccess) {
					return reply.send({
						medias: [],
						page,
						size,
						total,
						videoTotal,
						imageTotal,
						hasAccess,
					});
				}

				const [paidPostTransactions, medias] = await Promise.all([
					prisma.paidPostTransaction.findMany({
						where: {
							userId: BigInt(session.userId),
							status: { in: [TransactionStatus.Successful] },
						},
						include: { paidPost: true },
					}),
					prisma.upload.findMany({
						where: {
							type: type ?? { in: ["Video", "Image"] },
							usage: UploadUsageType.POST,
							postMedias: {
								some: {
									post: {
										profileId: profile.id,
										isArchived: false,
										isPosted: true,
									},
								},
							},
						},
						include: {
							postMedias: {
								include: {
									post: true,
								},
							},
						},
						orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
						take: size,
						skip: (page - 1) * size,
					}),
				]);

				const paidOutPostIds = paidPostTransactions.map(
					(ppt) => ppt.paidPost.postId,
				);

				const result: MediasRespBody = {
					medias: await Promise.all(
						medias.map(async (m) => {
							const url = await resolveAuthenticatedMediaURL(
								m,
								cloudflareStream,
								mediaUpload,
							);

							const media = ModelConverter.toIMedia(m, {
								isPaidPost: m.postMedias.some(
									(pm) => pm.post.isPaidPost,
								),
								isPaidOut: m.postMedias.some((pm) =>
									paidOutPostIds.includes(pm.postId),
								),
							});
							media.url = url;
							return media;
						}),
					),
					page,
					size,
					total,
					videoTotal,
					imageTotal,
					hasAccess,
				};
				return reply.send(result);
			}

			const result: MediasRespBody = {
				medias: [],
				page,
				size,
				total,
				videoTotal,
				imageTotal,
				hasAccess: false,
			};
			return reply.send(result);
		},
	);

	const validUsages: string[] = [UploadUsageType.CHAT, UploadUsageType.POST];

	fastify.post<{
		Params: MediaTypeParam;
		Body: GeneratePresignedUrlReqBody;
		Reply: PresignedUrlRespBody;
	}>(
		"/generate-presigned-url/:type",
		{
			schema: {
				params: MediaTypeParamValidator,
				body: GeneratePresignedUrlReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { type } = request.params;
			const { origin } = request.body;
			const usage = request.body.usage ?? UploadUsageType.POST;

			if (type === UploadType.Video) {
				return reply.sendError(
					APIErrors.UPLOAD_INVALID_TYPE(
						"This method only accepts Image, Audio and Form uploads.",
					),
				);
			}

			if (!validUsages.includes(usage)) {
				return reply.sendError(APIErrors.UPLOAD_INVALID_USAGE);
			}

			const { key, presignedUrl } =
				await mediaUpload.generatePutPresignedUrl(
					type === UploadType.Form ? "form" : "media",
					true,
				);
			const created = await prisma.upload.create({
				data: {
					id: snowflake.gen(),
					userId: BigInt(session.userId),
					type,
					origin,
					url: key,
					usage: usage as UploadUsageType,
					storage: UploadStorageType.S3,
				},
			});
			const result: PresignedUrlRespBody = {
				...ModelConverter.toIUpload(created),
				url: await resolveAuthenticatedMediaURL(
					created,
					cloudflareStream,
					mediaUpload,
				),
				presignedUrl,
			};
			return reply.send(result);
		},
	);

	fastify.post<{
		Params: MediaTypeParam;
		Body: TusUploadReqBody;
		Reply: TusUploadRespBody;
	}>(
		"/tus/:type",
		{
			schema: {
				params: MediaTypeParamValidator,
				body: TusUploadReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const { type } = request.params;
			const usage = request.body.usage ?? UploadUsageType.POST;

			if (!type) {
				return reply.sendError(APIErrors.ITEM_MISSING("Type"));
			} else if (type !== "Video") {
				return reply.sendError(
					APIErrors.UPLOAD_INVALID_TYPE(
						"This method only accepts Video uploads.",
					),
				);
			}

			if (!validUsages.includes(usage)) {
				return reply.sendError(APIErrors.UPLOAD_INVALID_USAGE);
			}

			const uploadLength = firstParam(request.headers["upload-length"]);
			if (!uploadLength) {
				return reply.sendError(
					APIErrors.INVALID_REQUEST(
						"Upload-Length header must be set.",
					),
				);
			}

			const upload = await cloudflareStream.createTusUpload(
				BigInt(session.userId),
				uploadLength,
			);

			const created = await prisma.upload.create({
				data: {
					id: snowflake.gen(),
					userId: BigInt(session.userId),
					type,
					url: upload.streamMediaId,
					usage: UploadUsageType.POST,
					storage: UploadStorageType.CLOUDFLARE_STREAM,
				},
			});

			const result: TusUploadRespBody = {
				...ModelConverter.toIUpload(created),
				url: await resolveAuthenticatedMediaURL(
					created,
					cloudflareStream,
					mediaUpload,
				),
				uploadUrl: upload.uploadUrl,
			};

			return reply.send(result);
		},
	);

	fastify.post<{ Params: IdParams; Body: FinishUploadReqBody }>(
		"/finish-upload/:id",
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
			const { id: uploadId } = request.params;
			const { isSuccess } = request.body;
			const media = await prisma.upload.findFirst({
				where: {
					id: BigInt(uploadId),
					userId: BigInt(session.userId),
				},
			});

			if (!media) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Upload"));
			}

			if (isSuccess) {
				await prisma.upload.update({
					where: {
						id: BigInt(uploadId),
						userId: BigInt(session.userId),
					},
					data: {
						completed: true,
					},
				});
			} else {
				const upload = await prisma.upload.delete({
					where: {
						id: BigInt(uploadId),
						userId: BigInt(session.userId),
					},
				});

				await deleteUploadFromCDN(
					upload,
					cloudflareStream,
					mediaUpload,
					logger,
				);
			}
		},
	);

	fastify.post<{ Params: IdParams }>(
		"/pin/:id",
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
			const session = request.session!;
			const { id: mediaId } = request.params;
			const media = await prisma.upload.findUnique({
				where: { id: BigInt(mediaId), userId: BigInt(session.userId) },
			});
			if (!media) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Media"));
			}

			const updatedMedia = await prisma.upload.update({
				where: { id: BigInt(mediaId) },
				data: { isPinned: true },
			});

			if (!updatedMedia) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Media"));
			}

			const result: MediaRespBody = ModelConverter.toIMedia(updatedMedia);
			return reply.status(200).send(result);
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/pin/:id",
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
			const session = request.session!;
			const { id: mediaId } = request.params;
			const media = await prisma.upload.findUnique({
				where: { id: BigInt(mediaId), userId: BigInt(session.userId) },
			});
			if (!media) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Media"));
			}

			const updatedMedia = await prisma.upload.update({
				where: { id: BigInt(mediaId) },
				data: { isPinned: false },
			});

			if (!updatedMedia) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Media"));
			}

			const result: MediaRespBody = ModelConverter.toIMedia(updatedMedia);
			return reply.status(200).send(result);
		},
	);
}
