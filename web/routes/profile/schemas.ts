import { AgeVerifyStatus, SubscriptionType } from "@prisma/client";
import {
	IBundle,
	ICampaign,
	ICategory,
	IFanReferral,
	IHighlight,
	IPlayList,
	IPost,
	IProfile,
	IProfilePreview,
	IRole,
	ISocialLink,
	IStory,
	ISubscription,
	ITier,
	IUpload,
	IUser,
} from "../../CommonAPISchemas.js";

export interface ProfileLinkReqBody {
	link: string;
}

export interface ProfileCreateReqBody {
	displayName?: string;
	bio: string;
	cover: string[];
	isNSFW: boolean;
	subscriptionType: SubscriptionType;
	migrationLink?: string;
	location?: string;
	birthday?: string;
	isFanReferralEnabled?: boolean;
	fanReferralShare?: number;
	marketingContentLink?: string;
	referrerCode?: string;
}

export interface ProfileMigrationReqBody {
	migrationLink: string;
}

export interface ProfileUpdateReqBody {
	displayName?: string;
	profileLink?: string;
	bio?: string;
	avatar?: string;
	cover?: string[];
	isNSFW?: boolean;
	subscriptionType?: SubscriptionType;
	migrationLink?: string;
	location?: string;
	birthday?: string;
	isFanReferralEnabled?: boolean;
	fanReferralShare?: number;
	marketingContentLink?: string;
}

export interface SocialLink {
	provider: string;
	url: string;
}

export interface SocialLinkReqBody {
	links: SocialLink[];
}

export interface ProfileFilterQuery {
	name?: string;
	page?: number;
	size?: number;
}

export interface ProfileRespBody extends IProfile {
	username?: string;
	avatar?: string;
	socialLinks?: ISocialLink[];
	categories?: ICategory[];
	subscriptions?: (ISubscription & {
		campaigns?: ICampaign[];
		bundles?: IBundle[];
	})[];
	tiers?: ITier[];
	roles?: IRole[];
	posts?: IPost[];
	user?: IUser;
	medias?: IUpload[];
	highlights?: (IHighlight & { stories?: IStory[] })[];
	previews?: IProfilePreview[];
	stories?: IStory[];
	imageCount?: number;
	videoCount?: number;
	subscriptionCount?: number;
	playlists?: IPlayList[];
	fanReferrals?: IFanReferral[];
	hasAccess?: boolean;
}

export interface ProfilesRespBody {
	profiles: ProfileRespBody[];
	page: number;
	size: number;
	total: number;
}

export interface SuggestedProfilesRespBody {
	profiles: ProfileRespBody[];
}

export interface SocialLinkRespBody extends ISocialLink {}

export interface SocialLinksRespBody {
	socialLinks: SocialLinkRespBody[];
}

export interface AgeVerifyOndatoRespBody {
	status: string;
	url: string;
}

export interface AgeVerifyOndatoWebhookReqBody {
	type: string;
	id: string;
	applicationId: string;
	createdUtc: string;
	deliveredUtc?: string;
	payload: {
		id: string;
		applicationId: string;
		identityVerificationId?: string;
		status: string;
		statusReason?: string;
	};
}

export interface PreviewCreateReqBody {
	previews: string[];
}

export interface AvatarCreateReqBody {
	avatar: string;
}

export interface ReferralLinkRespBody {
	referralCode: string;
}
