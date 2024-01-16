import {
	Application,
	Balance,
	Bookmark,
	Bundle,
	Campaign,
	Category,
	Comment,
	CommentReport,
	CreatorReferral,
	CreatorReferralTransaction,
	FanReferral,
	FanReferralTransaction,
	FanReferralTransactionType,
	Fundraiser,
	GemTransaction,
	GemsBalance,
	GemsSpendingLog,
	Giveaway,
	Highlight,
	Message,
	OAuth2LinkedAccount,
	PaidPost,
	PaymentMethod,
	PaymentSubscription,
	PaymentSubscriptionTransaction,
	PayoutLog,
	Playlist,
	PlaylistPost,
	PlaylistUpload,
	Poll,
	PollAnswer,
	Post,
	PostMedia,
	PostReport,
	Profile,
	ProfilePreview,
	ProfileReport,
	Role,
	Schedule,
	SocialLink,
	Story,
	StoryComment,
	StoryCommentLike,
	StoryMedia,
	StoryReport,
	StoryViewer,
	Subscription,
	TaggedPeople,
	Tier,
	Upload,
	UploadType,
	User,
	UserLevel,
	UserList,
	UserReport,
	XPAction,
	Meeting,
	MeetingType,
	MeetingInterval,
	WeekDay,
	MeetingDuration,
	CustomVideoDuration,
} from "@prisma/client";
import {
	IApplication,
	IBalance,
	IBookmark,
	IBundle,
	ICampaign,
	ICategory,
	IComment,
	ICommentReport,
	ICreatorReferral,
	ICreatorReferralTransaction,
	IFanReferral,
	IFanReferralTransaction,
	IFundraiser,
	IGemTransaction,
	IGemsBalance,
	IGemsSpendingLog,
	IGiveaway,
	IHighlight,
	IMedia,
	IMessage,
	IOAuth2LinkedAccount,
	IPaidPost,
	IPaymentMethod,
	IPaymentSubscription,
	IPaymentSubscriptionTransaction,
	IPayoutLog,
	IPlayList,
	IPlaylistPost,
	IPlaylistUpload,
	IPoll,
	IPollAnswer,
	IPost,
	IPostReport,
	IProfile,
	IProfilePreview,
	IProfileReport,
	IReply,
	IRole,
	ISchedule,
	ISocialLink,
	IStory,
	IStoryComment,
	IStoryCommentLike,
	IStoryReply,
	IStoryReport,
	IStoryViewer,
	ISubscription,
	ITaggedPeople,
	ITier,
	IUpload,
	IUser,
	IUserBasic,
	IUserLevel,
	IUserReport,
	IUserlist,
	IXPAction,
	IMeeting,
	IMeetingInterval,
	IMeetingDuration,
	Media,
} from "../CommonAPISchemas.js";
import SnowflakeService from "../../common/service/SnowflakeService.js";
import { PostAdvanced } from "../routes/post/schemas.js";
import { PrismaJson } from "../../common/Types.js";
import { toISODate } from "../../common/utils/DateUtils.js";
import CloudflareStreamService from "../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../common/service/MediaUploadService.js";
import { resolveAuthenticatedMediaURL } from "../utils/UploadUtils.js";
import { DateTime } from "luxon";

export interface UserBasicParam {
	id: bigint;
	username: string | null;
	displayName: string | null;
	avatar: string | null;
}

export class ModelConverter {
	static toIUser(user: User, isSelf = false): IUser {
		return {
			id: user.id.toString(),
			type: user.type,
			avatar: user.avatar,
			username: user.username!,
			displayName: user.displayName,
			phonenumber: isSelf ? user.phonenumber : null,
			email: isSelf ? user.email : null,
			country: user.country ?? undefined,
			language: user.language,
			gender: user.gender ?? undefined,
			birthdate: user.birthdate?.toISOString(),
			verifiedAt: user.verifiedAt?.toISOString(),
			activeUserListId: user.activeUserListId?.toString(),
			createdAt: SnowflakeService.extractDate(user.id).toISOString(),
			updatedAt: user.updatedAt.toISOString(),
			ageVerifyId: (isSelf ? user.ageVerifyId : null) ?? undefined,
			ageVerifyStatus:
				(isSelf ? user.ageVerifyStatus : null) ?? undefined,
			isShowProfile: user.isShowProfile,
		};
	}

	static toIUserBasic(user: UserBasicParam): IUserBasic {
		return {
			id: user.id.toString(),
			username: user.username!,
			displayName: user.displayName,
			avatar: user.avatar,
		};
	}

	static toICategory(
		category: Category & { _count?: { posts?: number } },
	): ICategory {
		return {
			id: category.id.toString(),
			profileId: category.profileId.toString(),
			name: category.name,
			isActive: category.isActive,
			updatedAt: category.updatedAt.toISOString(),
			postCount: category._count?.posts,
		};
	}

	static toIBalance(balance: Balance): IBalance {
		return {
			id: balance.id.toString(),
			profileId: balance.profileId.toString(),
			amount: balance.amount,
			currency: balance.currency,
			updatedAt: balance.updatedAt.toISOString(),
		};
	}

	static toIGemsSpendingLog(
		gemsSpendingLog: GemsSpendingLog,
	): IGemsSpendingLog {
		return {
			id: gemsSpendingLog.id.toString(),
			spenderId: gemsSpendingLog.spenderId.toString(),
			creatorId: gemsSpendingLog.creatorId.toString(),
			type: gemsSpendingLog.type,
			amount: gemsSpendingLog.amount,
			platformFee: gemsSpendingLog.platformFee,
			currency: gemsSpendingLog.currency,
			fanReferralCode: gemsSpendingLog.fanReferralCode ?? undefined,
			updatedAt: gemsSpendingLog.updatedAt.toISOString(),
		};
	}

	static toIGemsBalance(gemsBalance: GemsBalance): IGemsBalance {
		return {
			id: gemsBalance.id.toString(),
			userId: gemsBalance.userId.toString(),
			amount: gemsBalance.amount,
			currency: gemsBalance.currency,
			updatedAt: gemsBalance.updatedAt.toISOString(),
		};
	}

	static toIGemTransaction(gemTransaction: GemTransaction): IGemTransaction {
		return {
			id: gemTransaction.id.toString(),
			balanceId: gemTransaction.balanceId.toString(),
			userId: gemTransaction.userId.toString(),
			provider: gemTransaction.provider,
			transactionId: gemTransaction.transactionId?.toString(),
			amount: gemTransaction.amount,
			processingFee: gemTransaction.processingFee,
			platformFee: gemTransaction.platformFee,
			currency: gemTransaction.currency,
			status: gemTransaction.status,
			error: gemTransaction.error ?? undefined,
			createdAt: SnowflakeService.extractDate(
				gemTransaction.id,
			).toISOString(),
			updatedAt: gemTransaction.updatedAt.toISOString(),
		};
	}

	static toIPaymentMethod(paymentMethod: PaymentMethod): IPaymentMethod {
		return {
			id: paymentMethod.id.toString(),
			userId: paymentMethod.userId.toString(),
			provider: paymentMethod.provider,
			token: paymentMethod.token,
			createdAt: SnowflakeService.extractDate(
				paymentMethod.id,
			).toISOString(),
			updatedAt: paymentMethod.updatedAt.toISOString(),
		};
	}

	static toIPaymentSubscription(
		paymentSubscription: PaymentSubscription,
	): IPaymentSubscription {
		return {
			id: paymentSubscription.id.toString(),
			userId: paymentSubscription.userId.toString(),
			creatorId: paymentSubscription.creatorId.toString(),
			paymentMethodId: paymentSubscription.paymentMethodId?.toString(),
			paymentProfileId: paymentSubscription.paymentProfileId ?? undefined,
			subscriptionId: paymentSubscription.subscriptionId?.toString(),
			tierId: paymentSubscription.tierId?.toString(),
			bundleId: paymentSubscription.bundleId?.toString(),
			campaignId: paymentSubscription.campaignId?.toString(),
			transactionId: paymentSubscription.transactionId?.toString(),
			provider: paymentSubscription.provider ?? undefined,
			interval: paymentSubscription.interval ?? undefined,
			startDate: paymentSubscription.startDate.toISOString(),
			endDate: paymentSubscription.endDate?.toISOString(),
			amount: paymentSubscription.amount,
			processingFee: paymentSubscription.processingFee,
			platformFee: paymentSubscription.platformFee,
			currency: paymentSubscription.currency,
			status: paymentSubscription.status,
			error: paymentSubscription.error ?? undefined,
			fanReferralCode: paymentSubscription.fanReferralCode ?? undefined,
			createdAt: paymentSubscription.createdAt.toISOString(),
			updatedAt: paymentSubscription.updatedAt.toISOString(),
		};
	}

	static toIPaymentSubscriptionTransaction(
		paymentSubscriptionTransaction: PaymentSubscriptionTransaction,
	): IPaymentSubscriptionTransaction {
		return {
			id: paymentSubscriptionTransaction.id.toString(),
			userId: paymentSubscriptionTransaction.userId.toString(),
			creatorId: paymentSubscriptionTransaction.creatorId.toString(),
			paymentSubscriptionId:
				paymentSubscriptionTransaction.paymentSubscriptionId.toString(),
			transactionId:
				paymentSubscriptionTransaction.transactionId ?? undefined,
			amount: paymentSubscriptionTransaction.amount,
			currency: paymentSubscriptionTransaction.currency,
			status: paymentSubscriptionTransaction.status,
			error: paymentSubscriptionTransaction.error ?? undefined,
			createdAt: paymentSubscriptionTransaction.createdAt.toISOString(),
		};
	}

	static toIUserLevel(userLevel: UserLevel): IUserLevel {
		return {
			id: userLevel.id.toString(),
			xp: userLevel.xp,
			level: userLevel.level,
			label: userLevel.label ?? undefined,
			userId: userLevel.userId.toString(),
			updatedAt: userLevel.updatedAt.toISOString(),
		};
	}

	static toIXPAction(xpAction: XPAction): IXPAction {
		return {
			id: xpAction.id.toString(),
			action: xpAction.action,
			xp: xpAction.xp,
			type: xpAction.type,
			updatedAt: xpAction.updatedAt.toISOString(),
		};
	}

	static toIApplication(application: Application): IApplication {
		return {
			id: application.id.toString(),
			userId: application.userId.toString(),
			name: application.name,
			token: application.token,
			icon: application.icon ?? undefined,
			createdAt: application.createdAt.toISOString(),
		};
	}

	static toIPost(
		post: Post & {
			_count?: {
				bookmarks?: number;
				postLikes?: number;
				comments?: number;
			};
			profile?: Profile;
			postMedias: (PostMedia & { upload: Upload })[];
			thumbMedia: Upload | null;
		},
		metadata?: {
			isBookmarked?: boolean;
			isCommented?: boolean;
			isLiked?: boolean;
			isPaidOut?: boolean;
			isSelf?: boolean;
			isExclusive?: boolean;
		},
	): IPost {
		return {
			id: post.id.toString(),
			profileId: post.profileId.toString(),
			profile: post.profile ? this.toIProfile(post.profile) : undefined,
			title: post.title,
			type: post.type,
			caption: post.caption,
			thumb: post.thumbMedia
				? {
						id: post.thumbMedia.id.toString(),
						url: post.thumbMedia.url,
						blurhash: post.thumbMedia.blurhash ?? undefined,
				  }
				: undefined,
			medias: post.postMedias.map((pm) => ({
				id: pm.uploadId.toString(),
				url:
					metadata?.isSelf || !post.isPaidPost || metadata?.isPaidOut
						? pm.upload.url
						: undefined,
				blurhash: pm.upload.blurhash ?? undefined,
			})),
			advanced: post.advanced
				? {
						isHideLikeViewCount: (
							post.advanced as PrismaJson<PostAdvanced>
						).isHideLikeViewCount,
						isTurnOffComment: (
							post.advanced as PrismaJson<PostAdvanced>
						).isTurnOffComment,
						isPaidLabelDisclaimer: (
							post.advanced as PrismaJson<PostAdvanced>
						).isPaidLabelDisclaimer,
				  }
				: undefined,
			location: post.location ?? undefined,
			isArchived: post.isArchived,
			isHidden: post.isHidden,
			commentCount: post._count?.comments,
			likeCount: post._count?.postLikes,
			bookmarkCount: post._count?.bookmarks,
			createdAt: SnowflakeService.extractDate(post.id).toISOString(),
			updatedAt: post.updatedAt.toISOString(),
			episodeNumber: post.episodeNumber ?? undefined,
			description: post.description ?? undefined,
			isPrivate: post.isPrivate ?? false,
			isNoiseReduction: post.isNoiseReduction ?? false,
			isAudioLeveling: post.isAudioLeveling ?? false,
			isPaidPost: post.isPaidPost,
			isPosted: post.isPosted,
			isPinned: post.isPinned,
			isBookmarked: metadata?.isBookmarked,
			isCommented: metadata?.isCommented,
			isLiked: metadata?.isLiked,
			isPaidOut: metadata?.isPaidOut,
			isSelf: metadata?.isSelf,
			isExclusive: metadata?.isExclusive,
			shareCount: post.shareCount,
			imageCount: post.postMedias.filter(
				(m) => m.upload.type === UploadType.Image,
			).length,
			videoLength: post.postMedias
				.filter((m) => m.upload.type === UploadType.Video)
				.reduce((sum, curr) => sum + curr.upload.length, 0),
		};
	}

	static async resolveIPostMedia(
		cloudflareStream: CloudflareStreamService,
		mediaUpload: MediaUploadService,
		post: Post & {
			_count?: {
				bookmarks?: number;
				postLikes?: number;
				comments?: number;
			};
			profile?: Profile;
			postMedias: (PostMedia & { upload: Upload })[];
			thumbMedia: Upload | null;
		},
		metadata?: {
			isBookmarked?: boolean;
			isCommented?: boolean;
			isLiked?: boolean;
			isPaidOut?: boolean;
		},
	): Promise<IPost> {
		const serializedPost = ModelConverter.toIPost(post, metadata);
		const thumb: Media | undefined = post.thumbMedia
			? {
					id: post.thumbMedia.id.toString(),
					url: await resolveAuthenticatedMediaURL(
						post.thumbMedia,
						cloudflareStream,
						mediaUpload,
					),
					blurhash: post.thumbMedia.blurhash ?? undefined,
			  }
			: undefined;
		const medias: Media[] = await Promise.all(
			post.postMedias.map(async (pm) => ({
				id: pm.uploadId.toString(),
				url:
					!post.isPaidPost || metadata?.isPaidOut
						? await resolveAuthenticatedMediaURL(
								pm.upload,
								cloudflareStream,
								mediaUpload,
						  )
						: undefined,
				blurhash: pm.upload.blurhash ?? undefined,
			})),
		);

		return {
			...serializedPost,
			thumb,
			medias,
		};
	}

	static toIMedia(
		upload: Upload,
		metadata: {
			isPaidPost?: boolean;
			isPaidOut?: boolean;
			isSelf?: boolean;
		} = {
			isPaidPost: false,
			isPaidOut: false,
			isSelf: false,
		},
	): IMedia {
		return {
			id: upload.id.toString(),
			type: upload.type,
			url:
				metadata.isSelf || !metadata.isPaidPost || metadata.isPaidOut
					? upload.url
					: undefined,
			blurhash: upload.blurhash ?? undefined,
			origin: upload.origin ?? undefined,
			isPinned: upload.isPinned,
			updatedAt: upload.updatedAt.toISOString(),
		};
	}

	static toIPlaylist(
		playlist: Playlist & {
			thumbMedia: Upload | null;
		},
	): IPlayList {
		return {
			id: playlist.id.toString(),
			profileId: playlist.profileId.toString(),
			title: playlist.title,
			description: playlist.description,
			thumb: playlist.thumbMedia?.url ?? "",
			isPrivate: playlist.isPrivate,
			viewCount: playlist.viewCount,
			updatedAt: playlist.updatedAt.toISOString(),
		};
	}

	static toIPlaylistPost(playlistPost: PlaylistPost): IPlaylistPost {
		return {
			id: playlistPost.id.toString(),
			playlistId: playlistPost.playlistId.toString(),
			postId: playlistPost.postId.toString(),
		};
	}

	static toIPlaylistUpload(playlistUpload: PlaylistUpload): IPlaylistUpload {
		return {
			id: playlistUpload.id.toString(),
			playlistId: playlistUpload.playlistId.toString(),
			uploadId: playlistUpload.uploadId.toString(),
		};
	}

	static toIFundraiser(
		fundraiser: Fundraiser & {
			thumbMedia: Upload | null;
		},
	): IFundraiser {
		return {
			id: fundraiser.id.toString(),
			postId: fundraiser.postId.toString(),
			title: fundraiser.title,
			caption: fundraiser.caption,
			thumb: fundraiser.thumbMedia
				? {
						id: fundraiser.thumbMedia.id.toString(),
						url: fundraiser.thumbMedia.url,
						blurhash: fundraiser.thumbMedia.blurhash ?? undefined,
				  }
				: undefined,
			price: fundraiser.price,
			currency: fundraiser.currency,
			endDate: fundraiser.endDate.toISOString(),
			isXpAdd: fundraiser.isXpAdd,
			updatedAt: fundraiser.updatedAt.toISOString(),
		};
	}

	static toIGiveaway(
		giveaway: Giveaway & {
			thumbMedia: Upload | null;
		},
	): IGiveaway {
		return {
			id: giveaway.id.toString(),
			postId: giveaway.postId.toString(),
			prize: giveaway.prize,
			thumb: giveaway.thumbMedia
				? {
						id: giveaway.thumbMedia.id.toString(),
						url: giveaway.thumbMedia.url,
						blurhash: giveaway.thumbMedia.blurhash ?? undefined,
				  }
				: undefined,
			endDate: giveaway.endDate.toISOString(),
			winnerCount: giveaway.winnerCount,
			updatedAt: giveaway.updatedAt.toISOString(),
		};
	}

	static toIPaidPost(
		paidPost: PaidPost & {
			thumbMedia: Upload | null;
		},
	): IPaidPost {
		return {
			id: paidPost.id.toString(),
			postId: paidPost.postId.toString(),
			price: paidPost.price,
			currency: paidPost.currency,
			thumb: paidPost.thumbMedia
				? {
						id: paidPost.thumbMedia.id.toString(),
						url: paidPost.thumbMedia.url,
						blurhash: paidPost.thumbMedia.blurhash ?? undefined,
				  }
				: undefined,
			isPinned: paidPost.isPinned,
			isHidden: paidPost.isHidden,
			updatedAt: paidPost.updatedAt.toISOString(),
		};
	}

	static toIPollAnswer(
		pollAnswer: PollAnswer & { _count: { pollVotes: number } },
	): IPollAnswer {
		return {
			id: pollAnswer.id.toString(),
			pollId: pollAnswer.pollId.toString(),
			answer: pollAnswer.answer,
			updatedAt: pollAnswer.updatedAt.toISOString(),
			voteCount: pollAnswer._count.pollVotes,
		};
	}

	static toIPoll(
		poll: Poll & {
			thumbMedia: Upload | null;
			pollAnswers?: (PollAnswer & { _count: { pollVotes: number } })[];
		},
	): IPoll {
		return {
			id: poll.id.toString(),
			postId: poll.postId.toString(),
			question: poll.question,
			caption: poll.caption,
			thumb: poll.thumbMedia
				? {
						id: poll.thumbMedia.id.toString(),
						url: poll.thumbMedia.url,
						blurhash: poll.thumbMedia.blurhash ?? undefined,
				  }
				: undefined,
			endDate: poll.endDate.toISOString(),
			isPublic: poll.isPublic,
			updatedAt: poll.updatedAt.toISOString(),
			answers: poll.pollAnswers
				? poll.pollAnswers.map((pa) => ModelConverter.toIPollAnswer(pa))
				: undefined,
		};
	}

	static toIRole(role: Role): IRole {
		return {
			id: role.id.toString(),
			profileId: role.profileId.toString(),
			name: role.name,
			color: role.color,
			icon: role.icon ?? undefined,
			customIcon: role.customIcon ?? undefined,
			level: role.level,
			updatedAt: role.updatedAt.toISOString(),
		};
	}

	static toISchedule(schedule: Schedule): ISchedule {
		return {
			id: schedule.id.toString(),
			postId: schedule.postId.toString(),
			startDate: schedule.startDate.toISOString(),
			endDate: schedule.endDate
				? schedule.endDate.toISOString()
				: undefined,
			updatedAt: schedule.updatedAt.toISOString(),
		};
	}

	static toIBundle(bundle: Bundle): IBundle {
		return {
			id: bundle.id.toString(),
			subscriptionId: bundle.subscriptionId?.toString(),
			title: bundle.title ?? undefined,
			month: bundle.month ?? undefined,
			discount: bundle.discount,
			limit: bundle.limit,
			isActive: bundle.isActive,
			updatedAt: bundle.updatedAt.toISOString(),
		};
	}

	static toICampaign(campaign: Campaign): ICampaign {
		return {
			id: campaign.id.toString(),
			subscriptionId: campaign.subscriptionId?.toString(),
			duration: campaign.duration ?? undefined,
			durationType: campaign.durationType ?? undefined,
			endDate: campaign.endDate ?? undefined,
			limit: campaign.limit,
			discount: campaign.discount,
			type: campaign.type,
			applicable: campaign.applicable,
			updatedAt: campaign.updatedAt.toISOString(),
		};
	}

	static toISubscription(subscription: Subscription): ISubscription {
		return {
			id: subscription.id.toString(),
			profileId: subscription.profileId.toString(),
			title: subscription.title,
			currency: subscription.currency,
			price: subscription.price,
			updatedAt: subscription.updatedAt.toISOString(),
		};
	}

	static toITier(tier: Tier): ITier {
		return {
			id: tier.id.toString(),
			profileId: tier.profileId.toString(),
			title: tier.title,
			price: tier.price,
			currency: tier.currency,
			description: tier.description,
			cover: tier.cover,
			perks: tier.perks,
			updatedAt: tier.updatedAt.toISOString(),
		};
	}

	static toISocialLink(socialLink: SocialLink): ISocialLink {
		return {
			id: socialLink.id.toString(),
			provider: socialLink.provider,
			url: socialLink.url,
			updatedAt: socialLink.updatedAt.toISOString(),
		};
	}

	static toIProfile(
		profile: Profile & {
			stories?: (Story & {
				_count?: {
					storyLikes?: number;
					storyComments?: number;
				};
				storyMedias: (StoryMedia & {
					upload: Upload;
				})[];
			})[];
		},
	): IProfile {
		return {
			id: profile.id.toString(),
			userId: profile.userId.toString(),
			avatar: profile.avatar ?? undefined,
			displayName: profile.displayName ?? undefined,
			profileLink: profile.profileLink ?? undefined,
			bio: profile.bio,
			cover: profile.cover,
			flags: profile.flags,
			isNSFW: profile.isNSFW,
			subscriptionType: profile.subscriptionType,
			birthday: profile.birthday
				? toISODate(profile.birthday)
				: undefined,
			disabled: profile.disabled,
			location: profile.location ?? undefined,
			migrationLink: profile.migrationLink ?? undefined,
			commentCount: profile.commentCount,
			likeCount: profile.likeCount,
			billingPaused: profile.billingPaused ?? undefined,
			explicitCommentFilter: profile.explicitCommentFilter ?? undefined,
			hideComments: profile.hideComments ?? undefined,
			hideLikes: profile.hideLikes ?? undefined,
			hideTips: profile.hideTips ?? undefined,
			isPremium: profile.isPremium ?? undefined,
			showProfile: profile.showProfile ?? undefined,
			uploadedVideoDuration: profile.uploadedVideoDuration,
			watermark: profile.watermark ?? undefined,
			isFanReferralEnabled: profile.isFanReferralEnabled,
			fanReferralShare: profile.fanReferralShare,
			marketingContentLink: profile.marketingContentLink ?? undefined,
			activeStories: profile.stories
				? profile.stories.map((s) => ModelConverter.toIStory(s))
				: undefined,
			isDisplayShop: profile.isDisplayShop,
			updatedAt: profile.updatedAt.toISOString(),
			createdAt: SnowflakeService.extractDate(profile.id).toISOString(),
		};
	}

	static toIUserlist(
		userlist: UserList,
		metadata?: {
			isActive?: boolean;
		},
	): IUserlist {
		return {
			id: userlist.id.toString(),
			userId: userlist.userId.toString(),
			title: userlist.title,
			updatedAt: userlist.updatedAt.toISOString(),
			isActive: metadata?.isActive ?? false,
		};
	}

	static toIPostReport(postReport: PostReport): IPostReport {
		return {
			id: postReport.id.toString(),
			userId: postReport.userId.toString(),
			postId: postReport.postId?.toString(),
			flag: postReport.flag,
			status: postReport.status,
			reason: postReport.reason ?? undefined,
			createdAt: SnowflakeService.extractDate(
				postReport.id,
			).toISOString(),
			updatedAt: postReport.updatedAt.toISOString(),
		};
	}

	static toIProfileReport(profileReport: ProfileReport): IProfileReport {
		return {
			id: profileReport.id.toString(),
			userId: profileReport.userId.toString(),
			profileId: profileReport.profileId?.toString(),
			flag: profileReport.flag,
			status: profileReport.status,
			reason: profileReport.reason ?? undefined,
			createdAt: SnowflakeService.extractDate(
				profileReport.id,
			).toISOString(),
			updatedAt: profileReport.updatedAt.toISOString(),
		};
	}

	static toIComment(
		comment: Comment & { _count?: { commentLikes?: number } },
	): IComment {
		return {
			id: comment.id.toString(),
			userId: comment.userId.toString(),
			postId: comment.postId.toString(),
			parentCommentId: comment.parentCommentId?.toString(),
			content: comment.content,
			likeCount: comment._count?.commentLikes,
			createdAt: SnowflakeService.extractDate(comment.id).toISOString(),
			updatedAt: comment.updatedAt.toISOString(),
		};
	}

	static toICommentReport(commentReport: CommentReport): ICommentReport {
		return {
			id: commentReport.id.toString(),
			userId: commentReport.userId.toString(),
			commentId: commentReport.commentId.toString(),
			flag: commentReport.flag,
			status: commentReport.status,
			reason: commentReport.reason ?? undefined,
			createdAt: SnowflakeService.extractDate(
				commentReport.id,
			).toISOString(),
			updatedAt: commentReport.updatedAt.toISOString(),
		};
	}

	static toIReplies(
		comments: (Comment & {
			user: User & {
				profile?:
					| (Profile & {
							stories: (Story & {
								_count?: {
									storyLikes?: number;
									storyComments?: number;
								};
								storyMedias: (StoryMedia & {
									upload: Upload;
								})[];
							})[];
					  })
					| null;
			};
			_count?: {
				commentLikes?: number;
				replies?: number;
			};
			metadata?: {
				isLiked?: boolean;
			};
		})[],
		parentId?: string,
	): IReply[] {
		return comments
			.filter((c) => c.parentCommentId?.toString() === parentId)
			.map((c) => ({
				id: c.id.toString(),
				userId: c.userId.toString(),
				user: ModelConverter.toIUser(c.user),
				profile: c.user.profile
					? ModelConverter.toIProfile(c.user.profile)
					: undefined,
				postId: c.postId.toString(),
				content: c.content,
				parentCommentId: c.parentCommentId?.toString(),
				likeCount: c._count?.commentLikes,
				replyCount: c._count?.replies,
				createdAt: SnowflakeService.extractDate(c.id).toISOString(),
				updatedAt: c.updatedAt.toISOString(),
				isLiked: c.metadata?.isLiked,
				replies: this.toIReplies(comments, c.id.toString()),
			}));
	}

	static toIStory(
		story: Story & {
			_count?: {
				storyLikes?: number;
				storyComments?: number;
			};
			storyMedias: (StoryMedia & { upload: Upload })[];
		},
		metadata?: { isCommented?: boolean; isLiked?: boolean },
	): IStory {
		return {
			id: story.id.toString(),
			profileId: story.profileId.toString(),
			isHightlight: story.isHighlight,
			isArchived: story.isArchived,
			likeCount: story._count?.storyLikes,
			commentCount: story._count?.storyComments,
			updatedAt: story.updatedAt.toISOString(),
			medias: story.storyMedias.map((sm) => sm.upload.url),
			isCommented: metadata?.isCommented,
			isLiked: metadata?.isLiked,
			shareCount: story.shareCount,
		};
	}

	static toIStoryReport(storyReport: StoryReport): IStoryReport {
		return {
			id: storyReport.id.toString(),
			userId: storyReport.userId.toString(),
			storyId: storyReport.storyId?.toString(),
			flag: storyReport.flag,
			status: storyReport.status,
			reason: storyReport.reason ?? undefined,
			createdAt: SnowflakeService.extractDate(
				storyReport.id,
			).toISOString(),
			updatedAt: storyReport.updatedAt.toISOString(),
		};
	}

	static toIUpload(upload: Upload): IUpload {
		return {
			id: upload.id.toString(),
			userId: upload.userId.toString(),
			type: upload.type,
			url: upload.url,
			origin: upload.origin ?? undefined,
			completed: upload.completed,
			isPinned: upload.isPinned,
			updatedAt: upload.updatedAt.toISOString(),
		};
	}

	static toIStoryViewer(storyViewer: StoryViewer): IStoryViewer {
		return {
			creatorId: storyViewer.creatorId.toString(),
			viewerId: storyViewer.viewerId.toString(),
		};
	}

	static toIProfilePreview(profilePreview: ProfilePreview): IProfilePreview {
		return {
			id: profilePreview.id.toString(),
			profileId: profilePreview.profileId.toString(),
			url: profilePreview.url,
		};
	}

	static toIUserReport(userReport: UserReport): IUserReport {
		return {
			id: userReport.id.toString(),
			creatorId: userReport.creatorId.toString(),
			userId: userReport.userId.toString(),
			flag: userReport.flag,
			status: userReport.status,
			reason: userReport.reason ?? undefined,
			createdAt: SnowflakeService.extractDate(
				userReport.id,
			).toISOString(),
			updatedAt: userReport.updatedAt.toISOString(),
		};
	}

	static toITaggedPeople(taggedPeople: TaggedPeople): ITaggedPeople {
		return {
			id: taggedPeople.id.toString(),
			postId: taggedPeople.postId.toString(),
			userId: taggedPeople.userId.toString(),
			pointX: taggedPeople.pointX,
			pointY: taggedPeople.pointY,
			updatedAt: taggedPeople.updatedAt.toISOString(),
		};
	}

	static toIHighlight(highlight: Highlight): IHighlight {
		return {
			id: highlight.id.toString(),
			profileId: highlight.profileId.toString(),
			title: highlight.title,
			cover: highlight.cover,
			updatedAt: highlight.updatedAt.toISOString(),
		};
	}

	static toIBookmark(bookmark: Bookmark): IBookmark {
		return {
			postId: bookmark.postId.toString(),
			userId: bookmark.userId.toString(),
		};
	}

	static toIMessage(
		message: Message & {
			user: UserBasicParam;
			uploads?: Upload[];
		},
	): IMessage {
		return {
			id: message.id.toString(),
			channelId: message.channelId.toString(),
			user: ModelConverter.toIUserBasic(message.user),
			createdAt: SnowflakeService.extractDate(message.id).toISOString(),
			content: message.content,
			messageType: message.messageType,
			images: message.uploads
				? message.uploads.map((u) => u.url)
				: undefined,
		};
	}

	static toIOAuth2LinkedAccount(
		linkedAccount: OAuth2LinkedAccount,
	): IOAuth2LinkedAccount {
		return {
			id: linkedAccount.id.toString(),
			userId: linkedAccount.userId.toString(),
			provider: linkedAccount.provider,
			accountId: linkedAccount.accountId,
			name: linkedAccount.name,
			email: linkedAccount.email,
			avatarUrl: linkedAccount.avatarUrl ?? undefined,
		};
	}

	static toIStoryComment(
		storyComment: StoryComment & {
			_count?: {
				storyCommentLikes?: number;
				replies?: number;
			};
		},
		metadata?: { isLiked?: boolean },
	): IStoryComment {
		return {
			id: storyComment.id.toString(),
			storyId: storyComment.storyId.toString(),
			userId: storyComment.userId.toString(),
			content: storyComment.content,
			likeCount: storyComment._count?.storyCommentLikes,
			replyCount: storyComment._count?.replies,
			isLiked: metadata?.isLiked,
			createdAt: SnowflakeService.extractDate(
				storyComment.id,
			).toISOString(),
			updatedAt: storyComment.updatedAt.toISOString(),
		};
	}

	static toIStoryReplies(
		storyComments: (StoryComment & {
			user: User & {
				profile?:
					| (Profile & {
							stories: (Story & {
								_count?: {
									storyLikes?: number;
									storyComments?: number;
								};
								storyMedias: (StoryMedia & {
									upload: Upload;
								})[];
							})[];
					  })
					| null;
			};
			_count?: {
				storyCommentLikes?: number;
				replies?: number;
			};
			metadata?: {
				isLiked?: boolean;
			};
		})[],
		parentId?: string,
	): IStoryReply[] {
		return storyComments
			.filter((c) => c.parentCommentId?.toString() === parentId)
			.map((c) => ({
				id: c.id.toString(),
				userId: c.userId.toString(),
				user: ModelConverter.toIUser(c.user),
				profile: c.user.profile
					? ModelConverter.toIProfile(c.user.profile)
					: undefined,
				storyId: c.storyId.toString(),
				content: c.content,
				parentCommentId: c.parentCommentId?.toString(),
				likeCount: c._count?.storyCommentLikes,
				replyCount: c._count?.replies,
				isLiked: c.metadata?.isLiked,
				createdAt: SnowflakeService.extractDate(c.id).toISOString(),
				updatedAt: c.updatedAt.toISOString(),
				replies: this.toIStoryReplies(storyComments, c.id.toString()),
			}));
	}

	static toIStoryCommentLike(
		storyCommentLike: StoryCommentLike,
	): IStoryCommentLike {
		return {
			storyCommentId: storyCommentLike.storyCommentId.toString(),
			userId: storyCommentLike.userId.toString(),
			updatedAt: storyCommentLike.updatedAt.toISOString(),
		};
	}

	static toICreatorReferral(
		creatorReferral: CreatorReferral,
	): ICreatorReferral {
		return {
			id: creatorReferral.id.toString(),
			profileId: creatorReferral.profileId.toString(),
			code: creatorReferral.code,
			visitCount: creatorReferral.visitCount,
			updatedAt: creatorReferral.updatedAt,
		};
	}

	static toICreatorReferralTransaction(
		creatorReferralTransaction: CreatorReferralTransaction,
	): ICreatorReferralTransaction {
		return {
			id: creatorReferralTransaction.id.toString(),
			referentId: creatorReferralTransaction.referentId.toString(),
			referrerId: creatorReferralTransaction.referrerId.toString(),
			type: creatorReferralTransaction.type,
			transactionId: creatorReferralTransaction.transactionId.toString(),
			amount: creatorReferralTransaction.amount,
			updatedAt: creatorReferralTransaction.updatedAt,
		};
	}

	static toIPayoutLog(payoutLog: PayoutLog): IPayoutLog {
		return {
			id: payoutLog.id.toString(),
			profileId: payoutLog.profileId.toString(),
			payoutPaymentMethodId: payoutLog.payoutPaymentMethodId.toString(),
			amount: payoutLog.amount,
			processingFee: payoutLog.processingFee,
			currency: payoutLog.currency,
			status: payoutLog.status,
			createdAt: payoutLog.createdAt.toISOString(),
			updatedAt: payoutLog.updatedAt.toISOString(),
		};
	}

	static toIFanReferral(fanReferral: FanReferral): IFanReferral {
		return {
			id: fanReferral.id.toString(),
			profileId: fanReferral.profileId.toString(),
			userId: fanReferral.userId.toString(),
			code: fanReferral.code.toString(),
			updatedAt: fanReferral.updatedAt.toISOString(),
		};
	}

	static toIFanReferralTransaction(
		fanReferralTransaction: FanReferralTransaction,
	): IFanReferralTransaction {
		return {
			id: fanReferralTransaction.id.toString(),
			referentId: fanReferralTransaction.referentId.toString(),
			creatorId: fanReferralTransaction.creatorId.toString(),
			referrerId: fanReferralTransaction.referrerId.toString(),
			fanReferralId: fanReferralTransaction.fanReferralId.toString(),
			type: fanReferralTransaction.type,
			transactionId: fanReferralTransaction.transactionId.toString(),
			amount: fanReferralTransaction.amount,
			updatedAt: fanReferralTransaction.updatedAt.toISOString(),
		};
	}

	static toIMeeting(data: Meeting): IMeeting {
		return {
			id: data.id.toString(),
			hostId: data.hostId.toString(),
			startDate: data.startDate,
			endDate: data.endDate,
		};
	}

	static toMeetingType(meetingType: string): MeetingType | undefined {
		return {
			OneOnOne_TwoWay: MeetingType.OneOnOne_TwoWay,
			OneOnOne_OneWay: MeetingType.OneOnOne_OneWay,
		}[meetingType];
	}

	static toIMeetingDuration(data: MeetingDuration): IMeetingDuration {
		return {
			id: data.id.toString(),
			length: data.length,
			price: Number(data.price),
			currency: data.currency,
			isEnabled: data.isEnabled,
		};
	}

	static toIMeetingInterval(data: MeetingInterval): IMeetingInterval {
		return {
			id: data.id.toString(),
			startTime:
				DateTime.fromJSDate(data.startTime)
					.toUTC()
					.toFormat("HH:mm:ss") + "Z",
			length: data.length,
			day: ModelConverter.weekDay2Index(data.day),
		};
	}

	static index2WeekDay(index: number) {
		const index2WeekDayMap: Record<number, WeekDay> = {
			0: WeekDay.Monday,
			1: WeekDay.Tuesday,
			2: WeekDay.Wednesday,
			3: WeekDay.Thursday,
			4: WeekDay.Friday,
			5: WeekDay.Saturday,
			6: WeekDay.Sunday,
		};
		return index2WeekDayMap[index];
	}

	static weekDay2Index(day: WeekDay) {
		const weekDay2IndexMap: Record<WeekDay, number> = {
			[WeekDay.Monday]: 0,
			[WeekDay.Tuesday]: 1,
			[WeekDay.Wednesday]: 2,
			[WeekDay.Thursday]: 3,
			[WeekDay.Friday]: 4,
			[WeekDay.Saturday]: 5,
			[WeekDay.Sunday]: 6,
		};
		return weekDay2IndexMap[day];
	}

	static toICameoDuration(data: CustomVideoDuration): IMeetingDuration {
		return {
			id: data.id.toString(),
			length: data.length,
			price: Number(data.price),
			currency: data.currency,
			isEnabled: data.isEnabled,
		};
	}
}
