import {
	AgeVerifyStatus,
	SubscriptionStatus,
	TransactionStatus,
	UploadType,
	UploadUsageType,
	UserType,
} from "@prisma/client";
import { isUsernameValid } from "../../../common/Validation.js";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import { syncUserInfo } from "../../../common/rpc/UserRPC.js";
import CloudflareStreamService from "../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../common/service/MediaUploadService.js";
import OndatoService from "../../../common/service/OndatoService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import RPCManagerService from "../../../common/service/RPCManagerService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import {
	IdParams,
	QueryWithPageParams,
} from "../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	QueryWithPageParamsValidator,
} from "../../../common/validators/validation.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import { checkAccess } from "../../utils/CheckUtils.js";
import {
	AgeVerifyOndatoRespBody,
	AgeVerifyOndatoWebhookReqBody,
	AvatarCreateReqBody,
	PreviewCreateReqBody,
	ProfileCreateReqBody,
	ProfileFilterQuery,
	ProfileLinkReqBody,
	ProfileRespBody,
	ProfileUpdateReqBody,
	ProfilesRespBody,
	SocialLinkReqBody,
	SocialLinksRespBody,
	SuggestedProfilesRespBody,
} from "./schemas.js";
import {
	AgeVerifyOndatoWebhookReqBodyValidator,
	AvatarCreateReqBodyValidator,
	PreviewCreateReqBodyValidator,
	ProfileFilterQueryValidator,
	ProfileLinkReqBodyValidator,
	ProfileReqBodyValidator,
	ProfileUpdateReqBodyValidator,
	SocialLinkReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const ondatoService = await container.resolve(OndatoService);
	const rpcService = await container.resolve(RPCManagerService);
	const mediaUpload = await container.resolve(MediaUploadService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);

	fastify.get<{ Reply: ProfileRespBody }>(
		"/me",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const hiddenStories = await prisma.hiddenStory.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyId: true },
			});
			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);

			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const profile = await prisma.profile.findFirst({
				include: {
					socialLinks: true,
					categories: true,
					subscriptions: {
						include: {
							campaigns: true,
							bundles: true,
						},
					},
					tiers: true,
					roles: {
						orderBy: { level: "desc" },
					},
					user: true,
					previews: true,
					stories: {
						where: {
							id: { notIn: hiddenStoryIds },
							profile: { userId: BigInt(session.userId) },
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
					highlights: {
						include: {
							stories: {
								include: {
									story: {
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
									},
								},
							},
						},
					},
				},
				where: { userId: BigInt(session.userId) },
			});

			if (!profile) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Profile"));
			}

			const paymentSubscriptions =
				await prisma.paymentSubscription.findMany({
					where: {
						creatorId: profile.id,
						user: { isNot: undefined },
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
									where: { creatorId: profile.id },
								},
							},
						},
					},
				});

			const fans = paymentSubscriptions
				.filter((ps) => ps.user.levels.length > 0)
				.map((ps) => ps.user.levels[0]);

			const [
				videoCount,
				imageCount,
				subscriptionCount,
				storyComments,
				storyLikes,
			] = await Promise.all([
				prisma.upload.count({
					where: {
						usage: UploadUsageType.POST,
						type: UploadType.Video,
						postMedias: {
							some: {
								post: { profileId: profile.id },
							},
						},
					},
				}),
				prisma.upload.count({
					where: {
						usage: UploadUsageType.POST,
						type: UploadType.Image,
						postMedias: {
							some: {
								post: { profileId: profile.id },
							},
						},
					},
				}),
				prisma.paymentSubscription.count({
					where: {
						creatorId: profile?.id,
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
				prisma.storyComment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
				prisma.storyLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
			]);

			const result: ProfileRespBody = {
				...ModelConverter.toIProfile(profile),
				socialLinks: profile.socialLinks.map((s) =>
					ModelConverter.toISocialLink(s),
				),
				categories: profile.categories.map((c) =>
					ModelConverter.toICategory(c),
				),
				subscriptions: profile.subscriptions.map((s) => ({
					...ModelConverter.toISubscription(s),
					campaigns: s.campaigns.map((c) =>
						ModelConverter.toICampaign(c),
					),
					bundles: s.bundles.map((b) => ModelConverter.toIBundle(b)),
				})),
				tiers: profile.tiers.map((t) => ModelConverter.toITier(t)),
				roles: profile.roles.map((r, index, array) => ({
					...ModelConverter.toIRole(r),
					fans:
						index === 0
							? fans.filter((fan) => fan!.level >= r.level).length
							: fans.filter(
									(fan) =>
										array[index - 1].level > fan!.level &&
										fan!.level >= r.level,
							  ).length,
				})),
				user: profile.user
					? ModelConverter.toIUser(profile.user, true)
					: undefined,
				highlights: profile.highlights.map((h) => ({
					...ModelConverter.toIHighlight(h),
					stories: h.stories.map((s) =>
						ModelConverter.toIStory(s.story),
					),
				})),
				previews: profile.previews.map((p) =>
					ModelConverter.toIProfilePreview(p),
				),
				stories: profile.stories.map((s) =>
					ModelConverter.toIStory(s, {
						isCommented: storyComments
							.map((sc) => sc.storyId)
							.includes(s.id),
						isLiked: storyLikes
							.map((sm) => sm.storyId)
							.includes(s.id),
					}),
				),
				imageCount,
				videoCount,
				subscriptionCount,
			};
			return reply.send(result);
		},
	);

	fastify.put<{ Body: PreviewCreateReqBody }>(
		"/me/preview",
		{
			schema: {
				body: PreviewCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { previews } = request.body;
			const profile = (await session.getProfile(prisma))!;

			const existedPreviews = await prisma.profilePreview.findMany({
				where: { profileId: BigInt(profile.id) },
			});

			const previewsToRemove = existedPreviews
				.filter((ep) => !previews.includes(ep.url))
				.map((ep) => ep.url);
			const previewsToAdd = previews.filter(
				(p) => !existedPreviews.map((e) => e.url).includes(p),
			);

			await prisma.profilePreview.deleteMany({
				where: {
					url: {
						in: previewsToRemove,
					},
				},
			});

			await prisma.profilePreview.createMany({
				data: previewsToAdd.map((p) => ({
					id: snowflake.gen(),
					profileId: profile.id,
					url: p,
				})),
			});

			return reply.send();
		},
	);

	fastify.put<{ Body: AvatarCreateReqBody }>(
		"/me/avatar",
		{
			schema: {
				body: AvatarCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { avatar } = request.body;
			const profile = (await session.getProfile(prisma))!;

			if (avatar && !avatar.startsWith("media/")) {
				return reply.sendError(APIErrors.INVALID_REQUEST());
			}

			await prisma.profile.update({
				where: {
					id: profile.id,
				},
				data: {
					avatar,
				},
			});

			await prisma.user.update({
				where: {
					id: BigInt(session.userId),
				},
				data: {
					avatar,
				},
			});
			return reply.send();
		},
	);

	fastify.get<{ Params: IdParams; Reply: ProfileRespBody }>(
		"/creator/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			// TODO: What do we do about this endpoint???
			// - it returns every post, every playlist, every giveaway without pagination which causes performance issues
			// - it also does no subscription access checks, so it leaks every creator's stuff...
			// - this endpoint appears to be only used in two story related screens
			// - we have other endpoints that do the same thing but with pagination and access checks
			// Suggestions:
			// - remove this endpoint

			// Videos returned by this endpoint are broken. I did not add resolution of the URLs
			// because we don't need this endpoint and it's not really used by the app.

			const session = request.session!;
			const selfProfile = await session.getProfile(prisma);
			const { id: userId } = request.params;
			const hiddenStories = await prisma.hiddenStory.findMany({
				where: { userId: BigInt(session.userId) },
				select: { storyId: true },
			});
			const hiddenStoryIds = hiddenStories.map((s) => s.storyId);

			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const profile = await prisma.profile.findFirst({
				where: { userId: BigInt(userId) },
				include: {
					socialLinks: true,
					categories: true,
					subscriptions: {
						include: {
							campaigns: true,
							bundles: true,
						},
					},
					tiers: true,
					roles: true,
					user: {
						include: {
							uploads: true,
						},
					},
					highlights: true,
					previews: true,
					stories: {
						where: {
							id: { notIn: hiddenStoryIds },
							profile: { userId: BigInt(session.userId) },
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
					playlists: {
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
											_count: {
												select: {
													bookmarks: true,
													postLikes: true,
													comments: true,
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
					},
				},
			});

			if (!profile) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Profile"));
			}

			const [bookmarks, comments, postLikes, storyComments, storyLikes] =
				await Promise.all([
					prisma.bookmark.findMany({
						where: { userId: BigInt(session.userId) },
						select: { postId: true },
					}),
					prisma.comment.findMany({
						where: { userId: BigInt(session.userId) },
						select: { postId: true },
					}),
					prisma.postLike.findMany({
						where: { userId: BigInt(session.userId) },
						select: { postId: true },
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

			const result: ProfileRespBody = {
				...ModelConverter.toIProfile(profile),
				socialLinks: profile.socialLinks.map((s) =>
					ModelConverter.toISocialLink(s),
				),
				categories: profile.categories.map((c) =>
					ModelConverter.toICategory(c),
				),
				subscriptions: profile.subscriptions.map((s) => ({
					...ModelConverter.toISubscription(s),
					campaigns: s.campaigns.map((c) =>
						ModelConverter.toICampaign(c),
					),
					bundles: s.bundles.map((b) => ModelConverter.toIBundle(b)),
				})),
				tiers: profile.tiers.map((t) => ModelConverter.toITier(t)),
				roles: profile.roles.map((r) => ModelConverter.toIRole(r)),
				user: profile.user
					? ModelConverter.toIUser(profile.user)
					: undefined,
				medias: profile.user?.uploads.map((u) =>
					ModelConverter.toIUpload(u),
				),
				highlights: profile.highlights.map((h) =>
					ModelConverter.toIHighlight(h),
				),
				previews: profile.previews.map((p) =>
					ModelConverter.toIProfilePreview(p),
				),
				stories: profile.stories.map((s) =>
					ModelConverter.toIStory(s, {
						isCommented: storyComments
							.map((sc) => sc.storyId)
							.includes(s.id),
						isLiked: storyLikes
							.map((sm) => sm.storyId)
							.includes(s.id),
					}),
				),
				playlists: profile.playlists.map((pl) => ({
					...ModelConverter.toIPlaylist(pl),
					posts: pl.posts.map((p) =>
						ModelConverter.toIPost(p.post, {
							isBookmarked: bookmarks
								.map((b) => b.postId)
								.includes(p.postId),
							isCommented: comments
								.map((c) => c.postId)
								.includes(p.postId),
							isLiked: postLikes
								.map((p) => p.postId)
								.includes(p.postId),
							isPaidOut: p.post.paidPost
								? p.post.paidPost.PaidPostTransaction.length > 0
								: false,
							isSelf: p.post.profileId === selfProfile?.id,
							isExclusive:
								p.post.roles.length > 0 ||
								p.post.tiers.length > 0 ||
								p.post.users.length > 0,
						}),
					),
					uploads: pl.uploads.map((u) =>
						ModelConverter.toIUpload(u.upload),
					),
				})),
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Querystring: ProfileFilterQuery; Reply: ProfilesRespBody }>(
		"/",
		{
			schema: {
				querystring: ProfileFilterQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			// get creators list
			const session = request.session!;
			const {
				name = "",
				page = 1,
				size = DEFAULT_PAGE_SIZE,
			} = request.query;
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

			const subscribedCreatorIds = paymentSubscriptions.map(
				(ps) => ps.creatorId,
			);

			const total = await prisma.profile.count({
				where: {
					user: {
						type: UserType.Creator,
						OR: [
							{ ageVerifyId: null },
							{
								ageVerifyStatus: {
									not: AgeVerifyStatus.APPROVED,
								},
							},
						],
					},
					OR: [
						{
							displayName: {
								contains: name,
								mode: "insensitive",
							},
						},
						{
							user: {
								username: {
									contains: name,
									mode: "insensitive",
								},
							},
						},
					],
					id: { in: subscribedCreatorIds },
					disabled: false,
				},
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const rows = await prisma.profile.findMany({
				where: {
					user: {
						type: UserType.Creator,
						OR: [
							{ ageVerifyId: null },
							{
								ageVerifyStatus: {
									not: AgeVerifyStatus.APPROVED,
								},
							},
						],
					},
					OR: [
						{
							displayName: {
								contains: name,
								mode: "insensitive",
							},
						},
						{
							user: {
								username: {
									contains: name,
									mode: "insensitive",
								},
							},
						},
					],
					id: { in: subscribedCreatorIds },
					disabled: false,
				},
				take: size,
				skip: (page - 1) * size,
				include: { user: true },
			});

			const result: ProfilesRespBody = {
				profiles: rows.map((p) => ({
					...ModelConverter.toIProfile(p),
					username: p.user?.username ?? undefined,
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Params: ProfileLinkReqBody; Reply: ProfileRespBody }>(
		"/link/:link",
		{
			schema: {
				params: ProfileLinkReqBodyValidator,
			},
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			const session = request.session;
			const selfProfile = await session?.getProfile(prisma);
			const { link } = request.params;

			// get profile by profile-link
			const profile = await prisma.profile.findFirst({
				where: {
					user: {
						username: {
							equals: link,
							mode: "insensitive",
						},
					},
				},
				include: {
					socialLinks: true,
					subscriptions: {
						include: {
							campaigns: true,
							bundles: true,
						},
					},
					tiers: true,
					categories: true,
					user: true,
					highlights: true,
					previews: true,
					playlists: {
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
											_count: {
												select: {
													bookmarks: true,
													postLikes: true,
													comments: true,
												},
											},
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
					},
					fanReferrals: true,
				},
			});
			if (!profile) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Profile"));
			}

			const [videoCount, imageCount, subscriptionCount] =
				await Promise.all([
					prisma.upload.count({
						where: {
							usage: UploadUsageType.POST,
							type: UploadType.Video,
							postMedias: {
								some: {
									post: { profileId: profile.id },
								},
							},
						},
					}),
					prisma.upload.count({
						where: {
							usage: UploadUsageType.POST,
							type: UploadType.Image,
							postMedias: {
								some: {
									post: { profileId: profile.id },
								},
							},
						},
					}),
					prisma.paymentSubscription.count({
						where: {
							creatorId: profile?.id,
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
				]);

			const hasAccess = session
				? await checkAccess(
						prisma,
						BigInt(session.userId),
						profile.userId,
						profile.id,
				  )
				: false;

			const [bookmarks, comments, postLikes, paidPostTransactions] =
				session && hasAccess
					? await Promise.all([
							prisma.bookmark.findMany({
								where: { userId: BigInt(session.userId) },
								select: { postId: true },
							}),
							prisma.comment.findMany({
								where: { userId: BigInt(session.userId) },
								select: { postId: true },
							}),
							prisma.postLike.findMany({
								where: { userId: BigInt(session.userId) },
								select: { postId: true },
							}),
							prisma.paidPostTransaction.findMany({
								where: {
									userId: BigInt(session.userId),
									status: {
										in: [TransactionStatus.Successful],
									},
								},
								select: { paidPost: true },
							}),
					  ])
					: [[], [], [], []];

			const result: ProfileRespBody = {
				...ModelConverter.toIProfile(profile),
				socialLinks: profile.socialLinks.map((s) =>
					ModelConverter.toISocialLink(s),
				),
				categories: profile.categories.map((c) =>
					ModelConverter.toICategory(c),
				),
				subscriptions: profile.subscriptions.map((s) => ({
					...ModelConverter.toISubscription(s),
					campaigns: s.campaigns.map((c) =>
						ModelConverter.toICampaign(c),
					),
					bundles: s.bundles.map((b) => ModelConverter.toIBundle(b)),
				})),
				tiers: profile.tiers.map((t) => ModelConverter.toITier(t)),
				user: profile.user
					? ModelConverter.toIUser(profile.user)
					: undefined,
				highlights: profile.highlights.map((h) =>
					ModelConverter.toIHighlight(h),
				),
				previews: profile.previews.map((p) =>
					ModelConverter.toIProfilePreview(p),
				),
				playlists: profile.playlists.map((pl) => ({
					...ModelConverter.toIPlaylist(pl),
					posts: pl.posts.map((p) =>
						ModelConverter.toIPost(p.post, {
							isBookmarked: bookmarks
								.map((b) => b.postId)
								.includes(p.postId),
							isCommented: comments
								.map((c) => c.postId)
								.includes(p.postId),
							isLiked: postLikes
								.map((p) => p.postId)
								.includes(p.postId),
							isPaidOut: paidPostTransactions
								.map((ppt) => ppt.paidPost.postId)
								.includes(p.postId),
							isSelf: p.post.profileId === selfProfile?.id,
							isExclusive:
								p.post.roles.length > 0 ||
								p.post.tiers.length > 0 ||
								p.post.users.length > 0,
						}),
					),
					uploads: pl.uploads.map((u) =>
						ModelConverter.toIUpload(u.upload),
					),
				})),
				fanReferrals: profile.fanReferrals.map((f) =>
					ModelConverter.toIFanReferral(f),
				),
				imageCount,
				videoCount,
				subscriptionCount,
				hasAccess,
			};
			return reply.send(result);
		},
	);

	/**
	 * Create social link for profile
	 */
	fastify.post<{ Body: SocialLinkReqBody; Reply: SocialLinksRespBody }>(
		"/social-link",
		{
			schema: {
				body: SocialLinkReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { links } = request.body;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const rows = await Promise.all(
				links.map((l) =>
					prisma.socialLink.upsert({
						create: {
							id: snowflake.gen(),
							profileId: profile.id,
							...l,
						},
						update: {
							url: l.url,
						},
						where: {
							profileId_provider: {
								profileId: profile.id,
								provider: l.provider,
							},
						},
					}),
				),
			);

			const result = {
				socialLinks: rows.map((r) => ModelConverter.toISocialLink(r)),
			};
			return reply.status(200).send(result);
		},
	);

	/**
	 * Create profile for user
	 */
	fastify.post<{ Body: ProfileCreateReqBody; Reply: ProfileRespBody }>(
		"/",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
			schema: {
				body: ProfileReqBodyValidator,
			},
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);
			if (!user) {
				return reply.sendError(APIErrors.UNAUTHORIZED);
			}
			const data = request.body;

			const profile = await prisma.profile.findFirst({
				where: {
					userId: user.id,
				},
			});
			if (profile) {
				return reply.sendError(APIErrors.PROFILE_EXIST);
			}

			if (!user.username) {
				return reply.sendError(APIErrors.INVALID_USERNAME);
			}

			const referrer = await prisma.creatorReferral.findFirst({
				where: {
					code: { equals: data.referrerCode, mode: "insensitive" },
				},
			});

			const created = await prisma.profile.create({
				data: {
					id: snowflake.gen(),
					displayName: data.displayName || "",
					bio: data.bio,
					cover: data.cover,
					profileLink: user.username,
					isNSFW: data.isNSFW,
					subscriptionType: data.subscriptionType,
					migrationLink: data.migrationLink || "",
					location: data.location || "",
					birthday: data.birthday
						? new Date(data.birthday)
						: undefined,
					userId: user.id,
					balance: { create: { id: snowflake.gen() } },
					payoutSchedule: { create: { id: snowflake.gen() } },
					isFanReferralEnabled: data.isFanReferralEnabled,
					fanReferralShare: data.fanReferralShare,
					marketingContentLink: data.marketingContentLink,
					referrerCode: referrer ? data.referrerCode : undefined,
					notificationsSettings: { create: { id: snowflake.gen() } },
				},
				include: { user: true },
			});

			// Create default roles for new profile
			await prisma.role.createMany({
				data: [
					{
						id: snowflake.gen(),
						profileId: created.id,
						name: "Beginner",
						level: 2,
						color: "#FF99E9",
						icon: "icon2",
					},
					{
						id: snowflake.gen(),
						profileId: created.id,
						name: "Enthusiast",
						level: 5,
						color: "#64C7F9",
						icon: "icon4",
					},
					{
						id: snowflake.gen(),
						profileId: created.id,
						name: "Loyal",
						level: 10,
						color: "#92EFDD",
						icon: "icon5",
					},
					{
						id: snowflake.gen(),
						profileId: created.id,
						name: "Devoted",
						level: 25,
						color: "#CFB4F9",
						icon: "icon3",
					},
					{
						id: snowflake.gen(),
						profileId: created.id,
						name: "Legend",
						level: 50,
						color: "#FCCE59",
						icon: "icon1",
					},
					{
						id: snowflake.gen(),
						profileId: created.id,
						name: "Elite",
						level: 100,
						color: "#FCCE59",
						icon: "icon7",
					},
				],
			});
			// update user type as Fan
			await prisma.user.update({
				data: {
					type: UserType.Creator,
					// avatar: data.avatar ? data.avatar : undefined,
				},
				where: { id: user.id },
			});

			const updatedUser = await prisma.user.findFirst({
				where: { id: user.id },
			});

			if (!updatedUser) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("User"));
			}
			const result = {
				...ModelConverter.toIProfile(created),
				user: ModelConverter.toIUser(updatedUser, true),
			};
			return reply.status(201).send(result);
		},
	);

	fastify.post<{
		Reply: AgeVerifyOndatoRespBody;
	}>(
		"/age-verify/ondato",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const idv = await ondatoService.createIDV({
				externalReferenceId: user.id.toString(),
				registration: {},
			});

			// save the externalId from ondato
			await prisma.user.update({
				where: { id: BigInt(user.id) },
				data: {
					ageVerifyId: idv.id,
					// ageVerifyKycId: idv.kycId,
					ageVerifyStatus: AgeVerifyStatus.PENDING,
				},
			});

			syncUserInfo(rpcService, user.id, {
				ageVerifyId: idv.id,
				ageVerifyStatus: AgeVerifyStatus.PENDING,
			});

			return reply.send({
				url: idv.url,
				status: AgeVerifyStatus.PENDING,
			});
		},
	);

	fastify.post<{
		Body: AgeVerifyOndatoWebhookReqBody;
	}>(
		"/age-verify/ondato/webhook",
		{
			schema: {
				body: AgeVerifyOndatoWebhookReqBodyValidator,
			},
		},
		async (request, reply) => {
			// do basic auth check
			const b64auth =
				(request.headers.authorization ?? "").split(" ")[1] ?? "";
			if (!b64auth) {
				return reply.sendError(APIErrors.UNAUTHORIZED);
			}

			const ondatoBasicAuth = ondatoService.webhookBasicAuth;
			try {
				const buffer = Buffer.from(b64auth, "base64");

				if (buffer.toString() !== ondatoBasicAuth) {
					throw new Error("Invalid credentials");
				}
			} catch (err) {
				return reply.sendError(APIErrors.UNAUTHORIZED);
			}

			const { body } = request;
			console.log("ondato webhook", body);

			const getUserId = async (idvId: string) =>
				prisma.user
					.findFirst({
						select: { id: true },
						where: {
							ageVerifyId: idvId,
						},
					})
					.then((u) => u?.id);

			if (body.type === "IdentityVerification.StatusChanged") {
				const idvId = body.payload.id;
				const statusReason = body.payload.statusReason;

				if (!idvId) return reply.sendError(APIErrors.INVALID_REQUEST());
				const userId = await getUserId(idvId);
				if (!userId)
					return reply.sendError(APIErrors.INVALID_REQUEST());

				if (
					body.payload.status === "Aborted" ||
					body.payload.status === "Expired"
				) {
					await prisma.user.update({
						where: { id: userId },
						data: {
							ageVerifyStatus: AgeVerifyStatus.CANCELLED,
							ageVerifyReason: statusReason,
						},
					});

					syncUserInfo(rpcService, userId, {
						ageVerifyId: idvId,
						ageVerifyStatus: AgeVerifyStatus.CANCELLED,
					});
				}
			} else if (
				body.type === "KycIdentification.Approved" ||
				body.type === "KycIdentification.Rejected"
			) {
				const idvId = body.payload.identityVerificationId;
				const statusReason = body.payload.statusReason;

				if (!idvId) return reply.sendError(APIErrors.INVALID_REQUEST());
				const userId = await getUserId(idvId);
				if (!userId)
					return reply.sendError(APIErrors.INVALID_REQUEST());

				const newStatus =
					body.type === "KycIdentification.Approved"
						? AgeVerifyStatus.APPROVED
						: AgeVerifyStatus.REJECTED;

				await prisma.user.update({
					where: { id: userId },
					data: {
						ageVerifyStatus: newStatus,
						ageVerifyReason: statusReason,
					},
				});

				syncUserInfo(rpcService, userId, {
					ageVerifyId: idvId,
					ageVerifyStatus: newStatus,
				});
			}

			return reply.send();
		},
	);

	/**
	 * Update profile for user
	 */
	fastify.put<{ Body: ProfileUpdateReqBody }>(
		"/me",
		{
			schema: {
				body: ProfileUpdateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			// check ownership
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const data = request.body;
			const birthday =
				data.birthday && new Date(data.birthday)
					? new Date(data.birthday)
					: null;

			const { avatar, profileLink, ...remainingData } = data;

			if (profileLink) {
				const oldProfile = await prisma.profile.findFirst({
					where: {
						profileLink: {
							equals: profileLink,
							mode: "insensitive",
						},
						id: { not: profile.id },
					},
				});

				if (oldProfile) {
					return reply.sendError(APIErrors.USERNAME_IS_TAKEN);
				}

				if (!isUsernameValid(profileLink)) {
					return reply.sendError(APIErrors.REGISTER_INVALID_USERNAME);
				}
			}

			if (avatar && !avatar.startsWith("media/")) {
				return reply.sendError(APIErrors.INVALID_REQUEST());
			}
			const transaction = [];

			transaction.push(
				prisma.profile.update({
					where: { id: BigInt(profile.id) },
					data: {
						...remainingData,
						birthday,
					},
				}),
			);

			if (avatar) {
				transaction.push(
					prisma.user.update({
						where: { id: profile.userId },
						data: { avatar },
					}),
				);
			}

			if (profileLink) {
				transaction.push(
					prisma.profile.update({
						where: { id: profile.id },
						data: { profileLink },
					}),
				);
				transaction.push(
					prisma.user.update({
						where: { id: profile.userId },
						data: { username: profileLink },
					}),
				);
			}

			await prisma.$transaction(transaction);

			return reply.status(202).send();
		},
	);

	fastify.get<{
		Querystring: QueryWithPageParams;
		Reply: ProfilesRespBody;
	}>(
		"/search",
		{
			schema: { querystring: QueryWithPageParamsValidator },
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			try {
				// get creators list
				const {
					query = "",
					page = 1,
					size = DEFAULT_PAGE_SIZE,
				} = request.query;
				const total = await prisma.profile.count({
					where: {
						OR: [
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								user: {
									username: {
										contains: query,
										mode: "insensitive",
									},
								},
							},
						],
						user: {
							type: UserType.Creator,
							OR: [
								{ ageVerifyId: null },
								{
									ageVerifyStatus: {
										not: AgeVerifyStatus.APPROVED,
									},
								},
							],
						},
						disabled: false,
					},
					orderBy: [
						{
							_relevance: {
								fields: ["displayName"],
								search: query,
								sort: "asc",
							},
						},
						{ likeCount: "desc" },
						{ commentCount: "desc" },
						{ updatedAt: "desc" },
					],
				});

				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}

				const profiles = await prisma.profile.findMany({
					where: {
						OR: [
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								user: {
									username: {
										contains: query,
										mode: "insensitive",
									},
								},
							},
						],
						user: {
							type: UserType.Creator,
							OR: [
								{ ageVerifyId: null },
								{
									ageVerifyStatus: {
										not: AgeVerifyStatus.APPROVED,
									},
								},
							],
						},
						disabled: false,
					},
					include: { user: true },
					orderBy: [
						{
							_relevance: {
								fields: ["displayName"],
								search: query,
								sort: "asc",
							},
						},
						{ likeCount: "desc" },
						{ commentCount: "desc" },
						{ updatedAt: "desc" },
					],
					take: size,
					skip: (page - 1) * size,
				});

				const result: ProfilesRespBody = {
					profiles: profiles.map((p) => ({
						...ModelConverter.toIProfile(p),
						username: p.user?.username ?? undefined,
					})),
					page,
					size,
					total,
				};
				return reply.send(result);
			} catch (err) {
				console.log(err);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get<{ Reply: SuggestedProfilesRespBody }>(
		"/suggest",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = await session.getProfile(prisma);
			const paymentSubscriptions =
				await prisma.paymentSubscription.findMany({
					where: {
						userId: BigInt(session.userId),
						OR: [
							{ status: SubscriptionStatus.Active },
							{ endDate: { lte: new Date() } },
						],
					},
				});
			const subscribedCreatorIds = paymentSubscriptions.map(
				(ps) => ps.creatorId,
			);

			// get creators list
			const rows = await prisma.profile.findMany({
				where: {
					user: {
						type: UserType.Creator,
						OR: [
							{ ageVerifyId: null },
							{
								ageVerifyStatus: {
									not: AgeVerifyStatus.APPROVED,
								},
							},
						],
					},
					disabled: false,
					id: {
						notIn: profile
							? [...subscribedCreatorIds, profile.id]
							: subscribedCreatorIds,
					},
				},
				orderBy: [{ likeCount: "desc" }, { commentCount: "desc" }],
				take: 15,
				include: {
					user: {
						include: { uploads: true },
					},
				},
			});

			const result: SuggestedProfilesRespBody = {
				profiles: rows.map((p) => ({
					...ModelConverter.toIProfile(p),
					username: p.user?.username ?? undefined,
				})),
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Params: IdParams }>(
		"/block/:id",
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
			const selfProfile = await session.getProfile(prisma);
			const { id: profileId } = request.params;
			if (selfProfile?.id.toString() === profileId) {
				return reply.sendError(APIErrors.CANNOT_PERFORM_ACTION_ON_SELF);
			}
			const profile = await prisma.profile.findFirst({
				where: { id: BigInt(profileId) },
			});
			if (!profile) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Profile"));
			}
			const existedCount = await prisma.blockedCreator.count({
				where: {
					userId: BigInt(session.userId),
					creatorId: BigInt(profileId),
				},
			});

			if (existedCount) {
				return reply.sendError(APIErrors.ALREADY_BLOCKED);
			}

			await prisma.blockedCreator.create({
				data: {
					userId: BigInt(session.userId),
					creatorId: BigInt(profileId),
				},
			});

			return reply.status(200).send();
		},
	);
}
