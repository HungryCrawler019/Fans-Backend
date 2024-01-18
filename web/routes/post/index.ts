import {
	Prisma,
	SubscriptionStatus,
	TransactionStatus,
	UploadStorageType,
	UploadType,
	UploadUsageType,
} from "@prisma/client";
import type { File, FilesObject } from "fastify-multer/lib/interfaces.js";
import { Logger } from "pino";
import { PrismaJson } from "../../../common/Types.js";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import BullMQService from "../../../common/service/BullMQService.js";
import CloudflareStreamService from "../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../common/service/MediaUploadService.js";
import NotificationService from "../../../common/service/NotificationService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import {
	IdParams,
	PageQuery,
	QueryWithPageParams,
} from "../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
	QueryWithPageParamsValidator,
} from "../../../common/validators/validation.js";
import { NotificationType } from "../../CommonAPISchemas.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import { checkAccess } from "../../utils/CheckUtils.js";
import { resolveURLsPostLike } from "../../utils/UploadUtils.js";
import {
	AnalyzeFansRespBody,
	BlockedCreatorsRespBody,
	OldPostFilterQuery,
	PostAdvanced,
	PostArchiveReqBody,
	PostCreateReqBody,
	PostDownloadsReqBody,
	PostFeedQuery,
	PostFilterQuery,
	PostHideRespBody,
	PostRespBody,
	PostUpdateReqBody,
	PostsRespBody,
	SaveFormReqBody,
	SearchFansRespBody,
	SendInvitationReqBody,
	UploadFormRespBody,
} from "./schemas.js";
import {
	PostArchiveReqBodyValidator,
	PostCreateReqBodyValidator,
	PostDownloadsBodyValidator,
	PostFeedQueryValidator,
	PostFilterQueryValidator,
	PostUpdateReqBodyValidator,
	SaveFormReqBodyValidator,
	SendInvitationReqBodyValidator,
} from "./validation.js";
import archiver from 'archiver';
import axios, { AxiosRequestConfig } from 'axios';
import { Stream } from "stream";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const logger = await container.resolve<Logger>("logger");
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);
	const mediaUpload = await container.resolve(MediaUploadService);
	const notification = await container.resolve(NotificationService);
	const bullMQService = await container.resolve(BullMQService);

	// pagination for loading post
	fastify.get<{ Querystring: PostFilterQuery; Reply: PostsRespBody }>(
		"/",
		{
			schema: { querystring: PostFilterQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const {
				query = "",
				type,
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				schedule = false,
			} = request.query;
			const total = await prisma.post.count({
				where: {
					OR: [
						{
							title: { contains: query, mode: "insensitive" },
						},
						{
							caption: {
								contains: query,
								mode: "insensitive",
							},
						},
					],
					type: type ?? undefined,
					profileId: profile.id,
					NOT: {
						schedule: schedule ? null : undefined,
						isPosted: !schedule ? false : undefined,
					},
				},
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const rows = await prisma.post.findMany({
				where: {
					OR: [
						{
							title: { contains: query, mode: "insensitive" },
						},
						{
							caption: {
								contains: query,
								mode: "insensitive",
							},
						},
					],
					type: type ?? undefined,
					profileId: profile.id,
					NOT: {
						schedule: schedule ? null : undefined,
						isPosted: !schedule ? false : undefined,
					},
				},
				include: {
					profile: true,
					paidPost: {
						include: { thumbMedia: true },
					},
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					schedule: true,
				},
				take: size,
				skip: (page - 1) * size,
			});

			await Promise.all(
				rows.map((p) =>
					resolveURLsPostLike(p, cloudflareStream, mediaUpload),
				),
			);

			const result: PostsRespBody = {
				posts: rows.map((row) => ({
					...ModelConverter.toIPost(row),
					paidPost: row.paidPost
						? ModelConverter.toIPaidPost(row.paidPost)
						: undefined,
					profile: ModelConverter.toIProfile(row.profile),
				})),
				page,
				size,
				total,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Body: PostArchiveReqBody }>(
		"/archive",
		{
			schema: { body: PostArchiveReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.body;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const post = await prisma.post.findFirst({
				where: { id: BigInt(id), profileId: profile.id },
			});
			if (!post) return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			await prisma.post.update({
				where: { id: BigInt(id) },
				data: { isArchived: !post.isArchived },
			});
			return reply.status(200).send();
		},
	);

	fastify.get<{ Querystring: PageQuery; Reply: PostsRespBody }>(
		"/archived",
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
			const profile = (await session.getProfile(prisma))!;

			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			const total = await prisma.post.count({
				where: {
					profileId: profile.id,
					isArchived: true,
				},
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const rows = await prisma.post.findMany({
				where: {
					profileId: profile.id,
					isArchived: true,
					NOT: {
						isPosted: false,
					},
				},
				include: {
					profile: true,
					paidPost: {
						include: { thumbMedia: true },
					},
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
				},
				take: size,
				skip: (page - 1) * size,
			});

			await Promise.all(
				rows.map((p) =>
					resolveURLsPostLike(p, cloudflareStream, mediaUpload),
				),
			);

			const result: PostsRespBody = {
				posts: rows.map((row) => ({
					...ModelConverter.toIPost(row),
					paidPost: row.paidPost
						? ModelConverter.toIPaidPost(row.paidPost)
						: undefined,
					profile: ModelConverter.toIProfile(row.profile),
				})),
				page,
				size,
				total,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Params: IdParams }>(
		"/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = await session.getProfile(prisma);
			const { id } = request.params;

			const hiddenStories = await prisma.hiddenStory.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyId: true },
			});
			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);
			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const row = await prisma.post.findFirst({
				where: { id: BigInt(id) },
				include: {
					roles: {
						include: { role: true },
					},
					tiers: true,
					users: true,
					paidPost: {
						include: {
							thumbMedia: true,
							PaidPostTransaction: {
								where: {
									userId: BigInt(session.userId),
									status: TransactionStatus.Successful,
								},
							},
						},
					},
					categories: {
						include: { category: true },
					},
					fundraiser: {
						include: { thumbMedia: true },
					},
					giveaway: {
						include: {
							thumbMedia: true,
							roles: {
								include: { role: true },
							},
						},
					},
					poll: {
						include: {
							thumbMedia: true,
							roles: { include: { role: true } },
							pollAnswers: {
								include: {
									_count: {
										select: { pollVotes: true },
									},
								},
							},
						},
					},
					comments: {
						include: { user: true },
					},
					schedule: true,
					taggedPeoples: {
						include: { user: true },
					},
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
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
					_count: {
						select: {
							bookmarks: true,
							postLikes: true,
							comments: true,
						},
					},
				},
			});
			if (!row) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			const commentLikes = await prisma.commentLike.findMany({
				where: { userId: BigInt(session.userId) },
			});

			await resolveURLsPostLike(row, cloudflareStream, mediaUpload);

			const result: PostRespBody = {
				...ModelConverter.toIPost(row, {
					isBookmarked:
						(await prisma.bookmark.count({
							where: {
								userId: BigInt(session.userId),
								postId: BigInt(id),
							},
						})) > 0,
					isCommented:
						(await prisma.comment.count({
							where: {
								userId: BigInt(session.userId),
								postId: BigInt(id),
							},
						})) > 0,
					isLiked:
						(await prisma.postLike.count({
							where: { userId: BigInt(session.userId) },
						})) > 0,
					isPaidOut: row.paidPost
						? row.paidPost.PaidPostTransaction.length > 0
						: false,
					isSelf: row.profileId === profile?.id,
					isExclusive:
						row.roles.length > 0 ||
						row.tiers.length > 0 ||
						row.users.length > 0,
				}),
				roles: row.roles.map((r) => ModelConverter.toIRole(r.role)),
				categories: row.categories.map((c) =>
					ModelConverter.toICategory(c.category),
				),
				giveaway: row.giveaway
					? {
						...ModelConverter.toIGiveaway(row.giveaway),
						roles: row.giveaway.roles.map((r) =>
							ModelConverter.toIRole(r.role),
						),
					}
					: undefined,
				fundraiser: row.fundraiser
					? ModelConverter.toIFundraiser(row.fundraiser)
					: undefined,
				poll: row.poll
					? {
						...ModelConverter.toIPoll(row.poll),
						roles: row.poll.roles.map((r) =>
							ModelConverter.toIRole(r.role),
						),
					}
					: undefined,

				replies: ModelConverter.toIReplies(
					row.comments.map((c) => ({
						...c,
						metadata: {
							isLiked: commentLikes
								.map((cl) => cl.commentId)
								.includes(c.id),
						},
					})),
					undefined,
				),
				taggedPeoples: row.taggedPeoples.map((t) => ({
					...ModelConverter.toITaggedPeople(t),
					user: ModelConverter.toIUser(t.user),
				})),
				profile: ModelConverter.toIProfile(row.profile),
				paidPost: row.paidPost
					? ModelConverter.toIPaidPost(row.paidPost)
					: undefined,
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Body: PostCreateReqBody }>(
		"/",
		{
			schema: { body: PostCreateReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const data = request.body;

			let isPosted = true;

			if (
				data.schedule &&
				new Date(data.schedule.startDate).getTime() >
				new Date().getTime()
			) {
				isPosted = false;
			}

			if (data.paidPost) {
				const uploads = await prisma.upload.findMany({
					where: {
						usage: UploadUsageType.POST,
						userId: BigInt(session.userId),
						OR: [
							{
								id: {
									in: data.mediaIds?.map((id) => BigInt(id)),
								},
							},
							{
								id: data.thumbId
									? BigInt(data.thumbId)
									: undefined,
							},
							{
								id: data.paidPost.thumbId
									? BigInt(data.paidPost.thumbId)
									: undefined,
							},
							{
								id: data.fundraiser?.thumbId
									? BigInt(data.fundraiser?.thumbId)
									: undefined,
							},
							{
								id: data.giveaway?.thumbId
									? BigInt(data.giveaway?.thumbId)
									: undefined,
							},
							{
								id: data.poll?.thumbId
									? BigInt(data.poll?.thumbId)
									: undefined,
							},
						],
					},
				});
				await Promise.all(
					uploads
						.filter((u) => u.type === "Image" || u.type === "Video")
						.map(async (u) => {
							const blurhash =
								u.type === "Image"
									? await mediaUpload.generateBlurhash(u.url)
									: "00RV*9";
							await prisma.upload.update({
								where: { id: u.id },
								data: { blurhash },
							});
						}),
				);
			}

			// data.mediaIds
			if (
				data.mediaIds &&
				data.mediaIds.length > 0 &&
				(await prisma.upload.count({
					where: {
						id: { in: data.mediaIds.map((m) => BigInt(m)) },
						userId: { not: BigInt(session.userId) },
						usage: UploadUsageType.POST,
					},
				})) > 0
			) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			// data.formIds
			if (
				data.formIds &&
				data.formIds.length > 0 &&
				(await prisma.upload.count({
					where: {
						id: { in: data.formIds.map((f) => BigInt(f)) },
						userId: { not: BigInt(session.userId) },
						usage: UploadUsageType.POST,
					},
				}))
			) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			// data.roles
			if (
				data.roles &&
				data.roles.length > 0 &&
				(await prisma.role.count({
					where: {
						id: { in: data.roles.map((r) => BigInt(r)) },
						profileId: { not: profile.id },
					},
				}))
			) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			// data.tiers
			if (
				data.tiers &&
				data.tiers.length > 0 &&
				(await prisma.tier.count({
					where: {
						id: { in: data.tiers.map((t) => BigInt(t)) },
						profileId: { not: profile.id },
					},
				}))
			) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			// data.categories
			if (
				data.categories &&
				data.categories.length > 0 &&
				(await prisma.category.count({
					where: {
						id: { in: data.categories.map((c) => BigInt(c)) },
						profileId: { not: profile.id },
					},
				}))
			) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			const created = await prisma.post.create({
				data: {
					id: snowflake.gen(),
					title: data.title,
					type: data.type,
					caption: data.caption || "",
					thumb: data.thumbId || "",
					thumbId: data.thumbId ? BigInt(data.thumbId) : undefined,
					resource: [],
					text: data.text,
					advanced:
						(data?.advanced as PrismaJson<PostAdvanced>) ??
						Prisma.JsonNull,
					location: data.location,
					profileId: profile.id,
					episodeNumber: data.episodeNumber,
					description: data.description,
					isPrivate: data.isPrivate,
					isNoiseReduction: data.isNoiseReduction,
					isAudioLeveling: data.isAudioLeveling,
					isPaidPost: !!data.paidPost,
					isPosted: isPosted,
					postMedias: data.mediaIds
						? {
							createMany: {
								data: data.mediaIds.map((id) => ({
									id: snowflake.gen(),
									uploadId: BigInt(id),
								})),
							},
						}
						: undefined,
					postForms: data.formIds
						? {
							createMany: {
								data: data.formIds.map((formId) => ({
									uploadId: BigInt(formId),
								})),
							},
						}
						: undefined,
					taggedPeoples: data.taggedPeoples
						? {
							createMany: {
								data: data.taggedPeoples.map((t) => ({
									id: snowflake.gen(),
									userId: BigInt(t.userId),
									pointX: t.pointX,
									pointY: t.pointY,
								})),
							},
						}
						: undefined,
					roles:
						data.roles && data.roles?.length > 0
							? {
								createMany: {
									data: data.roles?.map((r) => ({
										id: snowflake.gen(),
										roleId: BigInt(r),
									})),
								},
							}
							: undefined,
					tiers:
						data.tiers && data.tiers?.length > 0
							? {
								createMany: {
									data: data.tiers?.map((r) => ({
										id: snowflake.gen(),
										tierId: BigInt(r),
									})),
								},
							}
							: undefined,
					users:
						data.users && data.users?.length > 0
							? {
								createMany: {
									data: data.users?.map((r) => ({
										id: snowflake.gen(),
										userId: BigInt(r),
									})),
								},
							}
							: undefined,
					paidPost: data.paidPost
						? {
							create: {
								id: snowflake.gen(),
								currency: data.paidPost.currency,
								price: data.paidPost.price,
								thumbId: data.paidPost.thumbId
									? BigInt(data.paidPost.thumbId)
									: undefined,
							},
						}
						: undefined,
					categories:
						data.categories && data.categories.length > 0
							? {
								createMany: {
									data: data.categories.map((r) => ({
										id: snowflake.gen(),
										categoryId: BigInt(r),
									})),
								},
							}
							: undefined,
					fundraiser: data.fundraiser
						? {
							create: {
								id: snowflake.gen(),
								title: data.fundraiser.title,
								caption: data.fundraiser.caption,
								thumbId: data.fundraiser.thumbId
									? BigInt(data.fundraiser.thumbId)
									: undefined,
								price: data.fundraiser.price,
								currency: data.fundraiser.currency,
								endDate: new Date(data.fundraiser.endDate),
								isXpAdd: data.fundraiser.isXpAdd,
							},
						}
						: undefined,
					giveaway: data.giveaway
						? {
							create: {
								id: snowflake.gen(),
								prize: data.giveaway.prize,
								thumbId: data.giveaway.thumbId
									? BigInt(data.giveaway.thumbId)
									: undefined,
								endDate: new Date(data.giveaway.endDate),
								winnerCount: data.giveaway.winnerCount,
							},
						}
						: undefined,
					schedule: data.schedule
						? {
							create: {
								id: snowflake.gen(),
								startDate: new Date(
									data.schedule.startDate,
								),
								endDate: data.schedule.endDate
									? new Date(data.schedule.endDate)
									: undefined,
							},
						}
						: undefined,
					poll: data.poll
						? {
							create: {
								id: snowflake.gen(),
								question: data.poll.question,
								caption: data.poll.caption,
								thumbId: data.poll.thumbId
									? BigInt(data.poll.thumbId)
									: undefined,
								endDate: new Date(data.poll.endDate),
							},
						}
						: undefined,
				},
				include: {
					categories: { include: { category: true } },
					fundraiser: { include: { thumbMedia: true } },
					giveaway: {
						include: {
							thumbMedia: true,
							roles: { include: { role: true } },
						},
					},
					paidPost: {
						include: { thumbMedia: true },
					},
					schedule: true,
					roles: { include: { role: true } },
					taggedPeoples: { include: { user: true } },
					profile: true,
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					poll: {
						include: {
							thumbMedia: true,
							roles: { include: { role: true } },
						},
					},
				},
			});

			if (!isPosted) {
				const queue = bullMQService.createQueue("scheduledPost");
				const delay =
					Number(new Date(data.schedule!.startDate)) -
					Number(new Date());
				const job = await queue.add(
					"scheduledPost",
					{
						id: created.id.toString(),
						profile: profile,
					},
					{ delay },
				);

				await prisma.schedule.update({
					where: { id: created.schedule!.id },
					data: {
						jobId: job.id,
					},
				});
			}

			if (created.poll && data.poll?.roles) {
				await prisma.pollAnswer.createMany({
					data: data.poll.answers.map((answer) => ({
						id: snowflake.gen(),
						pollId: created.poll!.id,
						answer,
					})),
				});
				await prisma.rolePoll.createMany({
					data: data.poll.roles.map((role) => ({
						id: snowflake.gen(),
						pollId: created.poll!.id,
						roleId: BigInt(role),
					})),
				});
			}

			if (created.giveaway && data.giveaway?.roles) {
				await prisma.roleGiveaway.createMany({
					data: data.giveaway.roles.map((role) => ({
						id: snowflake.gen(),
						giveawayId: created.giveaway!.id,
						roleId: BigInt(role),
					})),
				});
			}

			if (created.paidPost && data.paidPost) {
				if (data.paidPost.tiers && data.paidPost.tiers.length > 0) {
					await prisma.tierPost.createMany({
						data: data.paidPost.tiers
							.filter((t) =>
								data.tiers ? data.tiers.indexOf(t) < 0 : true,
							)
							.map((t) => ({
								id: snowflake.gen(),
								tierId: BigInt(t),
								postId: created.id,
							})),
					});
				}
				if (data.paidPost.users && data.paidPost.users.length > 0) {
					await prisma.userPost.createMany({
						data: data.paidPost.users
							.filter((u) =>
								data.users ? data.users.indexOf(u) < 0 : true,
							)
							.map((u) => ({
								id: snowflake.gen(),
								userId: BigInt(u),
								postId: created.id,
							})),
					});
				}
				if (data.paidPost.roles && data.paidPost.roles.length > 0) {
					await prisma.rolePost.createMany({
						data: data.paidPost.roles
							.filter((r) =>
								data.roles ? data.roles.indexOf(r) < 0 : true,
							)
							.map((r) => ({
								id: snowflake.gen(),
								roleId: BigInt(r),
								postId: created.id,
							})),
					});
				}
			}

			await resolveURLsPostLike(created, cloudflareStream, mediaUpload);

			const result: PostRespBody = {
				...ModelConverter.toIPost(created),
				roles: created.roles.map((r) => ModelConverter.toIRole(r.role)),
				categories: created.categories.map((c) =>
					ModelConverter.toICategory(c.category),
				),
				giveaway: created.giveaway
					? {
						...ModelConverter.toIGiveaway(created.giveaway),
						roles: created.giveaway.roles.map((r) =>
							ModelConverter.toIRole(r.role),
						),
					}
					: undefined,
				fundraiser: created.fundraiser
					? ModelConverter.toIFundraiser(created.fundraiser)
					: undefined,
				paidPost: created.paidPost
					? ModelConverter.toIPaidPost(created.paidPost)
					: undefined,
				schedule: created.schedule
					? ModelConverter.toISchedule(created.schedule)
					: undefined,
				taggedPeoples: created.taggedPeoples.map((t) => ({
					...ModelConverter.toITaggedPeople(t),
					user: ModelConverter.toIUser(t.user),
				})),
				poll: created.poll
					? {
						...ModelConverter.toIPoll(created.poll),
						roles: created.poll.roles.map((r) =>
							ModelConverter.toIRole(r.role),
						),
					}
					: undefined,
				profile: ModelConverter.toIProfile(created.profile),
			};
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: PostUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: PostUpdateReqBodyValidator,
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
			const data = request.body;

			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;

			const post = await prisma.post.findFirst({
				where: { id: BigInt(id), profileId: profile.id },
				include: {
					roles: true,
					categories: true,
					schedule: true,
				},
			});
			if (!post) return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));

			let newJobId = undefined;
			if (data.startDate && post.schedule?.jobId) {
				const queue = bullMQService.createQueue("scheduledPost");
				const job = await queue.getJob(post.schedule.jobId);
				if (job) {
					const status = await job.getState();
					if (status !== "active") {
						await job.remove();

						const delay =
							Number(new Date(data.startDate)) -
							Number(new Date());
						const newJob = await queue.add(
							"scheduledPost",
							{
								id: id,
								profile: profile,
							},
							{ delay },
						);
						newJobId = newJob.id;
					}
				}
			}

			const roleIds = post.roles.map((r) => r.roleId.toString());
			let rolesToAdd: string[] = [];
			let rolesToRemove: string[] = [];
			if (data.roles && data.roles.length > 0) {
				rolesToAdd = data.roles.filter((r) => !roleIds.includes(r));
				rolesToRemove = roleIds.filter((r) => !data.roles?.includes(r));
			}

			const categoryIds = post.categories.map((c) =>
				c.categoryId.toString(),
			);
			let categoriesToAdd: string[] = [];
			let categoriesToRemove: string[] = [];
			if (data.categories && data.categories.length > 0) {
				categoriesToAdd = data.categories.filter(
					(c) => !categoryIds.includes(c),
				);
				categoriesToRemove = categoryIds.filter(
					(c) => !data.categories?.includes(c),
				);
			}

			await prisma.post.update({
				where: { id: BigInt(id) },
				data: {
					title: data.title ?? undefined,
					type: data.type ?? undefined,
					caption: data.caption ?? undefined,
					thumb: data.thumb ?? undefined,
					resource: data.resource ?? undefined,
					advanced:
						(data?.advanced as PrismaJson<PostAdvanced>) ??
						Prisma.JsonNull,
					location: data.location,
					schedule: {
						update: {
							startDate: data.startDate ?? undefined,
							endDate: data.endDate ?? undefined,
							jobId: newJobId ?? undefined,
						},
					},
					roles: {
						deleteMany:
							rolesToRemove.length > 0
								? rolesToRemove.map((r) => ({
									roleId: BigInt(r),
								}))
								: undefined,
						createMany:
							rolesToAdd.length > 0
								? {
									data: rolesToAdd.map((r) => ({
										id: snowflake.gen(),
										roleId: BigInt(r),
									})),
								}
								: undefined,
					},
					categories: {
						deleteMany:
							categoriesToRemove.length > 0
								? categoriesToRemove.map((r) => ({
									categoryId: BigInt(r),
								}))
								: undefined,
						createMany:
							categoriesToAdd.length > 0
								? {
									data: categoriesToAdd.map((r) => ({
										id: snowflake.gen(),
										categoryId: BigInt(r),
									})),
								}
								: undefined,
					},
				},
			});
			return reply.status(200).send();
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{
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
			const post = await prisma.post.findFirst({
				where: { id: BigInt(id) },
				include: {
					thumbMedia: true,
					postMedias: {
						select: { upload: true },
					},
				},
			});
			if (post?.profileId !== profile.id) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			// for (const upload of post.postMedias.map((p) => p.upload)) {
			// 	prisma.upload
			// 		.delete({
			// 			where: {
			// 				id: upload.id,
			// 				userId: BigInt(session.userId),
			// 			},
			// 		})
			// 		.then(() =>
			// 			deleteUploadFromCDN(
			// 				upload,
			// 				cloudflareStream,
			// 				mediaUpload,
			// 				logger,
			// 			),
			// 		);
			// }

			// delete post
			await prisma.post.delete({ where: { id: BigInt(id) } });

			return reply.status(200).send();
		},
	);

	fastify.put<{ Params: IdParams }>(
		"/hide/:id",
		{
			schema: { params: IdParamsValidator },
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
			const post = await prisma.post.findFirst({
				where: { id: BigInt(id), profileId: profile.id },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}
			await prisma.post.update({
				where: { id: BigInt(id) },
				data: { isHidden: true },
			});
			return reply.status(200).send();
		},
	);

	fastify.get<{ Querystring: QueryWithPageParams; Reply: PostsRespBody }>(
		"/search",
		{
			schema: {
				querystring: QueryWithPageParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const {
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				query = "",
			} = request.query;
			const total = await prisma.post.count({
				where: {
					OR: [
						{
							title: {
								contains: query,
								mode: query.startsWith("#")
									? "default"
									: "insensitive",
							},
							caption: {
								contains: query,
								mode: query.startsWith("#")
									? "default"
									: "insensitive",
							},
						},
					],
				},
				orderBy: [
					/// ToDo:  { likeCount: "desc" },
					/// ToDo: { commentCount: "desc" },
					{ id: "desc" },
				],
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const posts = await prisma.post.findMany({
				where: {
					OR: [
						{
							title: {
								contains: query,
								mode: query.startsWith("#")
									? "default"
									: "insensitive",
							},
							caption: {
								contains: query,
								mode: query.startsWith("#")
									? "default"
									: "insensitive",
							},
						},
					],
					NOT: {
						isPosted: false,
					},
				},
				include: {
					profile: true,
					paidPost: {
						include: { thumbMedia: true },
					},
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
				},
				orderBy: [
					// { likeCount: "desc" },
					// { commentCount: "desc" },
					{ id: "desc" },
				],
				take: size,
				skip: (page - 1) * size,
			});

			await Promise.all(
				posts.map((p) =>
					resolveURLsPostLike(p, cloudflareStream, mediaUpload),
				),
			);

			const result: PostsRespBody = {
				posts: posts.map((p) => ({
					...ModelConverter.toIPost(p),
					paidPost: p.paidPost
						? ModelConverter.toIPaidPost(p.paidPost)
						: undefined,
					profile: ModelConverter.toIProfile(p.profile),
				})),
				page,
				size,
				total,
				hasAccess: true,
			};

			return reply.status(200).send(result);
		},
	);

	// pagination for loading post for Homepage feed
	fastify.get<{ Querystring: PostFeedQuery; Reply: PostsRespBody }>(
		"/feed",
		{
			schema: { querystring: PostFeedQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const {
				sort = "Latest",
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				categoryId,
				userListId,
			} = request.query;
			const session = request.session!;
			const profile = await session.getProfile(prisma);
			const user = await prisma.user.findFirst({
				where: { id: BigInt(session.userId) },
				include: {
					activeUserList: {
						include: {
							creators: true,
						},
					},
				},
			});
			const paymentSubscriptions =
				await prisma.paymentSubscription.findMany({
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
				});

			const userList = userListId
				? await prisma.userList.findFirst({
					where: {
						id: BigInt(userListId),
						userId: BigInt(session.userId),
					},
					include: { creators: true },
				})
				: undefined;

			const activeCreatorIds = userList
				? userList.creators.map((c) => c.profileId)
				: user?.activeUserList
					? user.activeUserList.creators.map((c) => c.profileId)
					: undefined;

			const subscribedCreatorIds = paymentSubscriptions.map(
				(ps) => ps.creatorId,
			);

			const hiddenPosts = await prisma.hiddenPost.findMany({
				select: { postId: true },
				where: { userId: BigInt(session.userId) },
			});
			const total = await prisma.post.count({
				where: {
					profileId: {
						in: activeCreatorIds
							? activeCreatorIds
							: subscribedCreatorIds,
					},
					id: { notIn: hiddenPosts.map((p) => p.postId) },
					isArchived: false,
					categories: categoryId
						? {
							some: {
								categoryId: BigInt(categoryId),
							},
						}
						: undefined,
				},
				orderBy:
					sort === "Latest"
						? { id: "desc" }
						: sort === "Popular"
							? [
								{ comments: { _count: "desc" } },
								{ postLikes: { _count: "desc" } },
							]
							: undefined,
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
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

			const [rows, metadata] = await Promise.all([
				prisma.post.findMany({
					where: {
						profileId: {
							in: activeCreatorIds
								? activeCreatorIds.filter((id) =>
									subscribedCreatorIds.includes(id),
								)
								: subscribedCreatorIds,
						},
						id: { notIn: hiddenPosts.map((p) => p.postId) },
						isArchived: false,
						categories: categoryId
							? {
								some: {
									categoryId: BigInt(categoryId),
								},
							}
							: undefined,
					},
					include: {
						thumbMedia: true,
						postMedias: {
							include: {
								upload: true,
							},
						},
						paidPost: {
							include: { thumbMedia: true },
						},
						fundraiser: {
							include: { thumbMedia: true },
						},
						giveaway: {
							include: {
								thumbMedia: true,
								roles: { include: { role: true } },
							},
						},
						poll: {
							include: {
								thumbMedia: true,
								roles: { include: { role: true } },
								pollAnswers: {
									include: {
										_count: {
											select: {
												pollVotes: true,
											},
										},
									},
								},
							},
						},
						roles: {
							include: { role: true },
						},
						tiers: true,
						users: true,
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
						categories: {
							include: {
								category: true,
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
					orderBy:
						sort === "Latest"
							? [{ id: "desc" }]
							: sort === "Popular"
								? [
									{ comments: { _count: "desc" } },
									{ postLikes: { _count: "desc" } },
								]
								: undefined,
					take: size,
					skip: (page - 1) * size,
				}),
				prisma.post.findMany({
					where: {
						profileId: { in: subscribedCreatorIds },
						id: { notIn: hiddenPosts.map((p) => p.postId) },
						categories: categoryId
							? {
								some: {
									categoryId: BigInt(categoryId),
								},
							}
							: undefined,
					},
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
										userId: BigInt(session.userId),
									},
								},
								postLikes: {
									where: {
										userId: BigInt(session.userId),
									},
								},
								comments: {
									where: {
										userId: BigInt(session.userId),
									},
								},
							},
						},
						paidPost: {
							where: {
								PaidPostTransaction: {
									some: {
										userId: BigInt(session.userId),
										status: TransactionStatus.Successful,
									},
								},
							},
							include: {
								PaidPostTransaction: {
									where: {
										userId: BigInt(session.userId),
										status: TransactionStatus.Successful,
									},
								},
							},
						},
					},
					orderBy:
						sort === "Latest"
							? [{ id: "desc" }]
							: sort === "Popular"
								? [
									{ comments: { _count: "desc" } },
									{ postLikes: { _count: "desc" } },
								]
								: undefined,
					take: size,
					skip: (page - 1) * size,
				}),
			]);

			await Promise.all(
				rows.map((p) =>
					resolveURLsPostLike(p, cloudflareStream, mediaUpload),
				),
			);

			const result: PostsRespBody = {
				posts: rows.map((row) => ({
					...ModelConverter.toIPost(row, {
						isBookmarked: metadata.find((m) => m.id === row.id)
							? metadata.find((m) => m.id === row.id)!._count
								.bookmarks > 0
							: false,
						isCommented: metadata.find((m) => m.id === row.id)
							? metadata.find((m) => m.id === row.id)!._count
								.comments > 0
							: false,
						isLiked: metadata.find((m) => m.id === row.id)
							? metadata.find((m) => m.id === row.id)!._count
								.postLikes > 0
							: false,
						isPaidOut:
							metadata.find((m) => m.id === row.id) &&
								metadata.find((m) => m.id === row.id)!.paidPost
								? metadata.find((m) => m.id === row.id)!
									.paidPost!.PaidPostTransaction.length >
								0
								: false,
						isSelf: row.profileId === profile?.id,
						isExclusive:
							row.roles.length > 0 ||
							row.tiers.length > 0 ||
							row.users.length > 0,
					}),
					paidPost: row.paidPost
						? ModelConverter.toIPaidPost(row.paidPost)
						: undefined,
					profile: ModelConverter.toIProfile(row.profile),
					categories: row.categories.map((c) =>
						ModelConverter.toICategory(c.category),
					),
					fundraiser: row.fundraiser
						? ModelConverter.toIFundraiser(row.fundraiser)
						: undefined,
					giveaway: row.giveaway
						? {
							...ModelConverter.toIGiveaway(row.giveaway),
							roles: row.giveaway.roles.map((role) =>
								ModelConverter.toIRole(role.role),
							),
						}
						: undefined,
					poll: row.poll
						? {
							...ModelConverter.toIPoll(row.poll),
							roles: row.poll.roles.map((r) =>
								ModelConverter.toIRole(r.role),
							),
						}
						: undefined,
					roles: row.roles.map((r) => ModelConverter.toIRole(r.role)),
				})),
				page,
				size,
				total,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);

	// pagination for loading post feed for profile
	fastify.get<{
		Params: IdParams;
		Querystring: PostFeedQuery;
		Reply: PostsRespBody;
	}>(
		"/feed/:id",
		{
			schema: { querystring: PostFeedQueryValidator },
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			const {
				sort = "Latest",
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				categoryId,
			} = request.query;
			const { id: userId } = request.params;
			const user = await prisma.user.findFirst({
				where: { id: BigInt(userId) },
				include: { profile: true },
			});

			if (!user) {
				return reply.sendError(APIErrors.USER_NOT_FOUND);
			}

			if (!user.profile) {
				return reply.sendError(APIErrors.PROFILE_NOT_FOUND);
			}

			const session = request.session;
			if (session) {
				const profile = await session.getProfile(prisma);
				const hiddenPosts = await prisma.hiddenPost.findMany({
					select: { postId: true },
					where: { userId: BigInt(session.userId) },
				});

				const total = await prisma.post.count({
					where: {
						profileId: user.profile.id,
						id: { notIn: hiddenPosts.map((p) => p.postId) },
						isArchived: false,
						categories: categoryId
							? {
								some: {
									categoryId: BigInt(categoryId),
								},
							}
							: undefined,
					},
					orderBy:
						sort === "Latest"
							? [{ isPinned: "desc" }, { id: "desc" }]
							: sort === "Popular"
								? [
									{ isPinned: "desc" },
									{ comments: { _count: "desc" } },
									{ postLikes: { _count: "desc" } },
								]
								: [{ isPinned: "desc" }],
				});

				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}

				const hasAccess = await checkAccess(
					prisma,
					BigInt(session.userId),
					user.id,
					user.profile.id,
				);

				if (!hasAccess) {
					return reply.send({
						posts: [],
						page,
						size,
						total,
						hasAccess: false,
					});
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

				const [rows, metadata] = await Promise.all([
					prisma.post.findMany({
						where: {
							profileId: user.profile.id,
							id: { notIn: hiddenPosts.map((p) => p.postId) },
							isArchived: false,
							categories: categoryId
								? {
									some: {
										categoryId: BigInt(categoryId),
									},
								}
								: undefined,
						},
						include: {
							thumbMedia: true,
							postMedias: {
								include: {
									upload: true,
								},
							},
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
							paidPost: {
								include: { thumbMedia: true },
							},
							categories: {
								include: { category: true },
							},
							taggedPeoples: {
								include: { user: true },
							},
							fundraiser: {
								include: { thumbMedia: true },
							},
							giveaway: {
								include: {
									thumbMedia: true,
									roles: { include: { role: true } },
								},
							},
							poll: {
								include: {
									thumbMedia: true,
									roles: { include: { role: true } },
									pollAnswers: {
										include: {
											_count: {
												select: {
													pollVotes: true,
												},
											},
										},
									},
								},
							},
							roles: {
								include: { role: true },
							},
							tiers: true,
							users: true,
							_count: {
								select: {
									bookmarks: true,
									postLikes: true,
									comments: true,
								},
							},
						},
						orderBy:
							sort === "Latest"
								? [{ isPinned: "desc" }, { id: "desc" }]
								: sort === "Popular"
									? [
										{ isPinned: "desc" },
										{ comments: { _count: "desc" } },
										{ postLikes: { _count: "desc" } },
									]
									: [{ isPinned: "desc" }],
						take: size,
						skip: (page - 1) * size,
					}),
					prisma.post.findMany({
						where: {
							profileId: user.profile.id,
							id: { notIn: hiddenPosts.map((p) => p.postId) },
							categories: categoryId
								? {
									some: {
										categoryId: BigInt(categoryId),
									},
								}
								: undefined,
						},
						include: {
							_count: {
								select: {
									bookmarks: {
										where: {
											userId: BigInt(session.userId),
										},
									},
									postLikes: {
										where: {
											userId: BigInt(session.userId),
										},
									},
									comments: {
										where: {
											userId: BigInt(session.userId),
										},
									},
								},
							},
							paidPost: {
								where: {
									PaidPostTransaction: {
										some: {
											userId: BigInt(session.userId),
											status: TransactionStatus.Successful,
										},
									},
								},
								include: {
									thumbMedia: true,
									PaidPostTransaction: {
										where: {
											userId: BigInt(session.userId),
											status: TransactionStatus.Successful,
										},
									},
								},
							},
							thumbMedia: true,
							postMedias: {
								include: { upload: true },
							},
						},
						orderBy:
							sort === "Latest"
								? [{ isPinned: "desc" }, { id: "desc" }]
								: sort === "Popular"
									? [
										{ isPinned: "desc" },
										{ comments: { _count: "desc" } },
										{ postLikes: { _count: "desc" } },
									]
									: [{ isPinned: "desc" }],
						take: size,
						skip: (page - 1) * size,
					}),
				]);

				await Promise.all(
					rows.map((p) =>
						resolveURLsPostLike(p, cloudflareStream, mediaUpload),
					),
				);

				const posts: PostRespBody[] = rows.map((row) => ({
					...ModelConverter.toIPost(row, {
						isBookmarked: metadata.find((m) => m.id === row.id)
							? metadata.find((m) => m.id === row.id)!._count
								.bookmarks > 0
							: false,
						isCommented: metadata.find((m) => m.id === row.id)
							? metadata.find((m) => m.id === row.id)!._count
								.comments > 0
							: false,
						isLiked: metadata.find((m) => m.id === row.id)
							? metadata.find((m) => m.id === row.id)!._count
								.postLikes > 0
							: false,
						isPaidOut:
							metadata.find((m) => m.id === row.id) &&
								metadata.find((m) => m.id === row.id)!.paidPost
								? metadata.find((m) => m.id === row.id)!
									.paidPost!.PaidPostTransaction.length >
								0
								: false,
						isSelf: row.profileId === profile?.id,
						isExclusive:
							row.roles.length > 0 ||
							row.tiers.length > 0 ||
							row.users.length > 0,
					}),
					profile: ModelConverter.toIProfile(row.profile),
					paidPost: row.paidPost
						? ModelConverter.toIPaidPost(row.paidPost)
						: undefined,
					categories: row.categories.map((c) =>
						ModelConverter.toICategory(c.category),
					),
					taggedPeoples: row.taggedPeoples.map((t) => ({
						...ModelConverter.toITaggedPeople(t),
						user: ModelConverter.toIUser(t.user),
					})),
					fundraiser: row.fundraiser
						? ModelConverter.toIFundraiser(row.fundraiser)
						: undefined,
					giveaway: row.giveaway
						? {
							...ModelConverter.toIGiveaway(row.giveaway),
							roles: row.giveaway.roles.map((role) =>
								ModelConverter.toIRole(role.role),
							),
						}
						: undefined,
					poll: row.poll
						? {
							...ModelConverter.toIPoll(row.poll),
							roles: row.poll.roles.map((r) =>
								ModelConverter.toIRole(r.role),
							),
						}
						: undefined,
					roles: row.roles.map((r) => ModelConverter.toIRole(r.role)),
				}));

				const result: PostsRespBody = {
					posts,
					page,
					size,
					total,
					hasAccess,
				};
				return reply.send(result);
			}
			const total = await prisma.post.count({
				where: {
					profileId: user.profile.id,
					isArchived: false,
					categories: categoryId
						? {
							some: {
								categoryId: BigInt(categoryId),
							},
						}
						: undefined,
				},
			});

			const result: PostsRespBody = {
				posts: [],
				page,
				size,
				total,
				hasAccess: false,
			};
			return reply.send(result);
		},
	);

	// Hide a post by ID from feed
	// return updated hidden post IDs
	fastify.post<{ Params: IdParams }>(
		"/hidden/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: postId } = request.params;
			const userId = session.userId;

			const post = await prisma.post.findFirst({
				select: { id: true },
				where: { id: BigInt(postId) },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			const hiddenPost = await prisma.hiddenPost.findFirst({
				where: { userId: BigInt(userId), postId: BigInt(postId) },
			});

			if (hiddenPost) {
				return reply.sendError(APIErrors.POST_IS_HIDDEN_ALREADY);
			} else {
				await prisma.hiddenPost.create({
					data: {
						userId: BigInt(userId),
						postId: BigInt(postId),
					},
				});
			}

			const rows = await prisma.hiddenPost.findMany({
				where: { userId: BigInt(userId) },
			});

			const result: PostHideRespBody = {
				hiddenPostIds: rows.map((row) => row.postId.toString()),
			};
			return reply.send(result);
		},
	);

	// Show a post by ID from feed
	// return updated hidden post IDs
	fastify.delete<{ Params: IdParams }>(
		"/hidden/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: postId } = request.params;
			const userId = session.userId;

			const post = await prisma.post.findFirst({
				select: { id: true },
				where: { id: BigInt(postId) },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			const hiddenPost = await prisma.hiddenPost.delete({
				where: {
					userId_postId: {
						userId: BigInt(userId),
						postId: BigInt(postId),
					},
				},
			});

			if (!hiddenPost) {
				return reply.sendError(APIErrors.POST_IS_NOT_HIDDEN_YET);
			}

			const rows = await prisma.hiddenPost.findMany({
				where: { userId: BigInt(userId) },
			});

			const result: PostHideRespBody = {
				hiddenPostIds: rows.map((row) => row.postId.toString()),
			};
			return reply.send(result);
		},
	);

	// Block a create of post by ID
	// return updated blocked creator IDs
	fastify.post<{ Params: IdParams }>(
		"/block-creator/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: postId } = request.params;
			const userId = session.userId;
			const profile = await session.getProfile(prisma);

			const post = await prisma.post.findFirst({
				where: { id: BigInt(postId) },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			} else if (post.profileId === profile?.id) {
				return reply.sendError(APIErrors.CANNOT_PERFORM_ACTION_ON_SELF);
			}

			const blockedCreator = await prisma.blockedCreator.findFirst({
				where: {
					userId: BigInt(userId),
					creatorId: BigInt(post.profileId),
				},
			});

			if (blockedCreator) {
				return reply.sendError(APIErrors.CREATOR_IS_BLOCKED_ALREADY);
			} else {
				await prisma.blockedCreator.create({
					data: {
						userId: BigInt(userId),
						creatorId: BigInt(post.profileId),
					},
				});
			}

			const rows = await prisma.blockedCreator.findMany({
				select: { creatorId: true },
				where: { userId: BigInt(userId) },
			});

			const result: BlockedCreatorsRespBody = {
				blockedCreatorIds: rows.map((row) => row.creatorId.toString()),
			};
			return reply.send(result);
		},
	);

	fastify.post(
		"/upload-form",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
				mediaUpload.getMulter("form").array("form"),
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const files: FilesObject | Partial<File>[] | undefined = (
				(await request) as any
			).files;

			if (!files || !Array.isArray(files)) {
				return reply.sendError(APIErrors.FILE_MISSING);
			}

			const formIds: bigint[] = [];
			await prisma.upload.createMany({
				data: files.map((file: any) => {
					const id = snowflake.gen();
					formIds.push(id);
					return {
						id,
						userId: BigInt(session.userId),
						type: UploadType.Form,
						url: file.path,
						origin: file.originalname,
						usage: UploadUsageType.POST,
						storage: UploadStorageType.S3,
					};
				}),
			});

			const rows = await prisma.upload.findMany({
				where: { id: { in: formIds } },
			});

			const result: UploadFormRespBody = {
				forms: rows.map((row) => ModelConverter.toIUpload(row)),
			};
			return reply.send(result);
		},
	);

	fastify.put<{ Body: SaveFormReqBody; Params: IdParams }>(
		"/save-form/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: SaveFormReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id } = request.params;
			const { formIds } = request.body;

			const profile = (await session.getProfile(prisma))!;
			const post = await prisma.post.findFirst({
				where: {
					id: BigInt(id),
					profileId: profile.id,
				},
			});

			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			await prisma.postForm.createMany({
				data: formIds.map((formId) => ({
					postId: BigInt(id),
					uploadId: BigInt(formId),
				})),
			});
			return reply.send();
		},
	);

	fastify.post<{ Body: SendInvitationReqBody }>(
		"/send-invitation",
		{
			schema: {
				body: SendInvitationReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			return reply.status(400).send();

			// const session = request.session!;
			// const user = await session.getUser(prisma);
			// const { emails, message } = request.body;
			// const emailData: SendEmailData = {
			// 	sender: user.email,
			// 	to: emails.filter((email) => isEmailValid(email)),
			// 	textContent: stripeTags(message),
			// 	subject: "Invitation to FYP.Fans",
			// };
			// await emailService.sendEmail(emailData);
			// return reply.status(200).send();
		},
	);

	fastify.get<{ Querystring: QueryWithPageParams }>(
		"/search-fans",
		{
			schema: { querystring: QueryWithPageParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const {
				query = "",
				page = 1,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;

			const profile = (await session.getProfile(prisma))!;
			const paymentSubscriptions =
				await prisma.paymentSubscription.findMany({
					where: {
						creatorId: profile.id,
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
					include: { user: true },
				});
			const fanIdSet = new Set<bigint>();
			paymentSubscriptions.forEach((ps) => fanIdSet.add(ps.user.id));
			const total = await prisma.user.count({
				where: {
					id: { in: Array.from(fanIdSet) },
					OR: [
						{
							username: {
								mode: "insensitive",
								contains: query,
							},
						},
						{
							displayName: {
								mode: "insensitive",
								contains: query,
							},
						},
					],
				},
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}
			const fans = await prisma.user.findMany({
				where: {
					id: { in: Array.from(fanIdSet) },
					OR: [
						{
							username: {
								mode: "insensitive",
								contains: query,
							},
						},
						{
							displayName: {
								mode: "insensitive",
								contains: query,
							},
						},
					],
				},
				include: {
					levels: {
						where: {
							creatorId: profile.id,
						},
					},
				},
				skip: (page - 1) * size,
				take: size,
			});
			const result: SearchFansRespBody = {
				fans: fans.map((f) => ({
					...ModelConverter.toIUser(f),
					level: f.levels[0]
						? ModelConverter.toIUserLevel(f.levels[0])
						: undefined,
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.get(
		"/analyze-fans",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const paymentSubscriptions =
				await prisma.paymentSubscription.findMany({
					where: {
						creatorId: profile.id,
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
					include: {
						user: {
							include: {
								levels: {
									where: {
										creatorId: profile.id,
									},
								},
							},
						},
					},
				});
			const fans = paymentSubscriptions
				.filter((ps) => ps.user.levels.length > 0)
				.map((ps) => ({
					...ModelConverter.toIUser(ps.user),
					level: ps.user.levels[0]
						? ModelConverter.toIUserLevel(ps.user.levels[0])
						: undefined,
				}));

			const result: AnalyzeFansRespBody = {
				total: fans.length,
				data: [
					{
						from: 1,
						to: 20,
						fans: fans.filter(
							(f) => 0 < f.level!.level && f.level!.level < 21,
						).length,
					},
					{
						from: 21,
						to: 40,
						fans: fans.filter(
							(f) => 20 < f.level!.level && f.level!.level < 41,
						).length,
					},
					{
						from: 41,
						to: 60,
						fans: fans.filter(
							(f) => 40 < f.level!.level && f.level!.level < 61,
						).length,
					},
					{
						from: 61,
						to: 80,
						fans: fans.filter(
							(f) => 60 < f.level!.level && f.level!.level < 81,
						).length,
					},
					{
						from: 81,
						to: 100,
						fans: fans.filter((f) => 80 < f.level!.level).length,
					},
				],
			};
			reply.send(result);
		},
	);

	fastify.post<{ Params: IdParams }>(
		"/like/:id",
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
			const user = await session.getUser(prisma);
			const { id } = request.params;
			const post = await prisma.post.findUnique({
				where: { id: BigInt(id) },
				select: {
					id: true,
					profile: {
						select: {
							notificationsSettings: true,
						},
					},
				},
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}
			const postLike = await prisma.postLike.findUnique({
				where: {
					userId_postId: { userId: user.id, postId: BigInt(id) },
				},
			});
			if (postLike) {
				return reply.sendError(APIErrors.ALREADY_LIKE_POST);
			}

			await prisma.postLike.create({
				data: { postId: BigInt(id), userId: user.id },
			});
			const updatedPost = await prisma.post.findUnique({
				where: { id: BigInt(id) },
				include: {
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					_count: {
						select: { postLikes: true },
					},
				},
			});

			if (!updatedPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			const likeCountOfProfile = await prisma.postLike.count({
				where: {
					post: { profileId: updatedPost.profileId },
				},
			});

			await prisma.profile.update({
				where: { id: updatedPost.profileId },
				data: { likeCount: likeCountOfProfile },
			});

			if (post.profile.notificationsSettings?.likeCreatorInApp) {
				notification.sendPostInteractionNotification(
					post.id,
					user.id,
					NotificationType.LikePost,
				);
			}

			await resolveURLsPostLike(
				updatedPost,
				cloudflareStream,
				mediaUpload,
			);

			const result: PostRespBody = ModelConverter.toIPost(updatedPost, {
				isLiked:
					(await prisma.postLike.count({
						where: {
							userId: BigInt(session.userId),
							postId: BigInt(id),
						},
					})) > 0,
			});
			return reply.status(200).send(result);
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/like/:id",
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
			const user = await session.getUser(prisma);
			const { id } = request.params;
			const post = await prisma.post.findUnique({
				where: { id: BigInt(id) },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}
			const postLike = await prisma.postLike.findUnique({
				where: {
					userId_postId: { userId: user.id, postId: BigInt(id) },
				},
			});
			if (!postLike) {
				return reply.sendError(APIErrors.NOT_LIKE_POST_YET);
			}

			await prisma.postLike.delete({
				where: {
					userId_postId: {
						postId: BigInt(id),
						userId: user.id,
					},
				},
			});
			const updatedPost = await prisma.post.findUnique({
				where: { id: BigInt(id) },
				include: {
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					_count: {
						select: {
							postLikes: true,
						},
					},
				},
			});
			if (!updatedPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			const likeCountOfProfile = await prisma.postLike.count({
				where: {
					post: { profileId: updatedPost.profileId },
				},
			});

			await prisma.profile.update({
				where: { id: updatedPost.profileId },
				data: { likeCount: likeCountOfProfile },
			});

			notification.removePostInteractionFromNotification(
				post.id,
				user.id,
				NotificationType.LikePost,
			);

			await resolveURLsPostLike(
				updatedPost,
				cloudflareStream,
				mediaUpload,
			);

			const result: PostRespBody = ModelConverter.toIPost(updatedPost, {
				isLiked:
					(await prisma.postLike.count({
						where: {
							userId: BigInt(session.userId),
							postId: BigInt(id),
						},
					})) > 0,
			});
			return reply.status(200).send(result);
		},
	);

	fastify.post<{ Params: IdParams }>(
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
			const user = await session.getUser(prisma);
			const { id } = request.params;
			const post = await prisma.post.findUnique({
				where: { id: BigInt(id) },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			const updatedPost = await prisma.post.update({
				where: { id: BigInt(id) },
				data: { shareCount: post.shareCount + 1 },
				include: {
					thumbMedia: true,
					postMedias: {
						include: {
							upload: true,
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

			const result: PostRespBody = ModelConverter.toIPost(updatedPost);
			return reply.status(200).send(result);
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
			const profile = (await session.getProfile(prisma))!;
			const { id: postId } = request.params;
			const post = await prisma.post.findUnique({
				where: { id: BigInt(postId), profileId: profile.id },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			await prisma.upload.updateMany({
				where: { postMedias: { some: { postId: BigInt(postId) } } },
				data: { isPinned: true },
			});
			const updatedPost = await prisma.post.update({
				where: { id: BigInt(postId) },
				data: { isPinned: true },
				include: {
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
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

			const result: PostRespBody = ModelConverter.toIPost(updatedPost);
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
			const profile = (await session.getProfile(prisma))!;
			const { id: postId } = request.params;
			const post = await prisma.post.findUnique({
				where: { id: BigInt(postId), profileId: profile.id },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}

			await prisma.upload.updateMany({
				where: { postMedias: { some: { postId: BigInt(postId) } } },
				data: { isPinned: false },
			});
			const updatedPost = await prisma.post.update({
				where: { id: BigInt(postId) },
				data: { isPinned: false },
				include: {
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
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

			const result: PostRespBody = ModelConverter.toIPost(updatedPost);
			return reply.status(200).send(result);
		},
	);

	fastify.get<{ Querystring: OldPostFilterQuery; Reply: PostsRespBody }>(
		"/old",
		{
			schema: { querystring: PostFilterQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const {
				query = "",
				type,
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				schedule = false,
				orderBy = "Latest"
			} = request.query;
			const total = await prisma.post.count({
				where: {
					OR: [
						{
							title: { contains: query, mode: "insensitive" },
						},
						{
							caption: {
								contains: query,
								mode: "insensitive",
							},
						},
					],
					type: type ?? undefined,
					profileId: profile.id,
					NOT: {
						schedule: schedule ? null : undefined,
						isPosted: !schedule ? false : undefined,
					},
				},
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const rows = await prisma.post.findMany({
				where: {
					OR: [
						{
							title: { contains: query, mode: "insensitive" },
						},
						{
							caption: {
								contains: query,
								mode: "insensitive",
							},
						},
					],
					type: type ?? undefined,
					profileId: profile.id,
					NOT: {
						schedule: schedule ? null : undefined,
						isPosted: !schedule ? false : undefined,
						isArchived: true
					},
				},
				include: {
					profile: true,
					paidPost: {
						include: { thumbMedia: true },
					},
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					schedule: true,
				},
				take: size,
				skip: (page - 1) * size,
			});

			await Promise.all(
				rows.map((p) =>
					resolveURLsPostLike(p, cloudflareStream, mediaUpload),
				),
			);

			const result: PostsRespBody = {
				posts: rows.map((row) => ({
					...ModelConverter.toIPost(row),
					paidPost: row.paidPost
						? ModelConverter.toIPaidPost(row.paidPost)
						: undefined,
					profile: ModelConverter.toIProfile(row.profile),
				})),
				page,
				size,
				total,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Body: PostDownloadsReqBody }>(
		"/downloads",
		{
			schema: { body: PostDownloadsBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { postIds } = request.body;
			const bigintArray: bigint[] = postIds.map((str) => BigInt(str));
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const posts = await prisma.post.findMany({
				where: { id: { in: bigintArray }, profileId: profile.id },
				include: {
					profile: true,
					paidPost: {
						include: { thumbMedia: true },
					},
					thumbMedia: true,
					postMedias: {
						include: { upload: true },
					},
					schedule: true,
				},
			});

			await Promise.all(posts.map((p) => {
				return resolveURLsPostLike(p, cloudflareStream, mediaUpload);
			}));

			reply.send(posts)

			// // Set the headers to indicate a file download
			// reply.header('Content-Type', 'application/zip');
			// reply.header('Content-Disposition', 'attachment; filename="download.zip"');

			// // Create a zip archive using archiver
			// const archive = archiver('zip', {
			// 	zlib: { level: 9 }, // Compression level
			// });

			// // Pipe the archive data to the response
			// archive.pipe(reply.raw);

			// // Catch warnings and errors
			// archive.on('warning', (err) => {
			// 	if (err.code === 'ENOENT') {
			// 		console.warn('Warning during archiving:', err);
			// 	} else {
			// 		throw err;
			// 	}
			// });

			// archive.on('error', (err) => {
			// 	throw err;
			// });

			// // Append files to the archive
			// for (const post of posts) {
			// 	for(const fileUrl of post.postMedias){
			// 		try {
			// 			console.log(fileUrl.upload.url)
			// 			// Use axios to stream the file from the third-party server
			// 			const response = await axios({
			// 				method: 'get',
			// 				url: "https://fyp-fans-cdn-dev.harvestangels.co/"+fileUrl.upload.url,
			// 				responseType: 'stream',
			// 			} as AxiosRequestConfig<any>);
	
			// 			// Use the URL or a filename from the Content-Disposition header for the name in the archive
			// 			const filename = fileUrl.upload.url.split('/').pop() || 'file';
	
			// 			// Append the file stream to the archive
			// 			archive.append(response.data, { name: filename });
			// 		} catch (error) {
			// 			// Handle errors (e.g., file not found, network errors)
			// 			console.error(`Error downloading file from ${fileUrl}:`, error);
			// 		}
			// 	}
			// }

			// // Finalize the archive
			// archive.finalize();
		},
	);

}
