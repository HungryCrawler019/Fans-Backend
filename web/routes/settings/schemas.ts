import { GenderType, LanguageType } from "@prisma/client";
import {
	IPaymentSubscription,
	IPaymentSubscriptionTransaction,
	IPost,
	IUser,
} from "../../CommonAPISchemas.js";

export interface ChangePasswordReqBody {
	oldPassword: string;
	newPassword: string;
}

export interface UpdateSettingReqBody {
	username?: string;
	birthdate?: string;
	country?: string;
	displayName?: string;
	gender?: GenderType;
	language?: LanguageType;
	isShowProfile?: boolean;
	phonenumber?: string;
}

export interface UpdateEmailReqBody {
	email: string;
}

export interface VerifyNewEmailReqBody {
	code: string;
	newEmail: string;
}

export interface AnalyticsTransactionsRespBody {
	transactions: (IPaymentSubscriptionTransaction & { user: IUser })[];
	page: number;
	size: number;
	total: number;
}

export interface AnalyticsPostsRespBody {
	posts: IPost[];
	page: number;
	size: number;
	total: number;
}

export interface AnalyticsSubscribersRespBody {
	subscriptions: (IPaymentSubscription & {
		user: IUser;
		paymentSubscriptionTransactions: IPaymentSubscriptionTransaction[];
	})[];
	page: number;
	size: number;
	total: number;
}

export interface VerifyDeleteAccountReqBody {
	code: string;
}

export interface PriceDuration {
	price: number;
	duration: number;
	active: boolean;
}

export interface SocialMediaUrl {
	id: string;
	value: string;
	title: string;
}

export enum NotificationType {
	NewRequests = "New Requests",
	Cancellations = "Cancellations",
	Reminders = "Reminders",
}

export enum ContentPreference {
	Consultation = "Consultation",
	Advice = "Advice",
	Performance = "Performance",
	Adult = "Adult",
	Sexual = "Sexual",
	Spirituality = "Spirituality",
}

export interface CameoSettingsUpdateReqBody {
	cameo: {
		additionalContentPreferences?: string;
		pricesDuration?: PriceDuration[];
		contentPreferences?: string[];
		videoCallsEnabled?: boolean;
		tos?: boolean;
		sexualContent?: boolean;
		requestLimitations?: {
			fulFillmentTimeFrame: string;
			numberRequestsType: string;
			numberRequestsValue: number;
		};
		responseDescription?: string;
		uploadPreviews?: string[];
		notifications?: {
			newRequests: boolean;
			pendingVideos: boolean;
			completedRequests: boolean;
			notificationsByPhone: boolean;
			notificationsByEmail: boolean;
		};
		customVideoOrdersEnabled?: boolean;
		vacationMode?: boolean;
		vacationModeInterval?: {
			startDate: string;
			endDate: string;
		};
	};
}

export interface FanProfileSettingsUpdateReqBody {
	fanProfile: {
		bio?: string;
		displayName?: string;
		socialMedias?: SocialMediaUrl[];
		theme?: string;
	};
}

export interface RequiredXpRespBody {
	requiredXp: number;
	nextLevel: number;
}
