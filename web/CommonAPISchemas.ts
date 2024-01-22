// This file is supposed to be synced between app and backend
// app: src/helper/CommonAPISchemas.ts
// backend: web/CommonAPISchemas.ts

const userTypes = ["Creator", "Fan"] as const;
export type UserType = (typeof userTypes)[number];

const xpActionTypes = ["Multiple", "Add"] as const;
export type XPActionType = (typeof xpActionTypes)[number];

const subscriptionTypes = ["Tier", "Flat"] as const;
export type SubscriptionType = (typeof subscriptionTypes)[number];

const campaignTypes = ["NEW", "EXISTING", "BOTH"] as const;
export type CampaignType = (typeof campaignTypes)[number];

const promotionTypes = ["Free_Trial", "Discount"] as const;
export type PromotionType = (typeof promotionTypes)[number];

const uploadTypes = ["Video", "Image", "Audio", "Form"] as const;
export type UploadType = (typeof uploadTypes)[number];

const postTypes = [
	"Video",
	"Photo",
	"Text",
	"Audio",
	"Fundraiser",
	"Poll",
] as const;
export type PostType = (typeof postTypes)[number];

const genderTypes = ["Male", "Female", "NonBinary", "Other"] as const;
export type GenderType = (typeof genderTypes)[number];

const reportStatuses = ["OPEN", "IN_REVIEW", "ACCEPTED", "IGNORED"] as const;
export type ReportStatus = (typeof reportStatuses)[number];

const commentStatuses = ["VISIBLE", "HIDDEN", "SHADOW_BANNED"] as const;
export type CommentStatus = (typeof commentStatuses)[number];

const languages = ["English", "Russian"] as const;
export type LanguageType = (typeof languages)[number];

const durationTypes = ["Hours", "Days", "Weeks", "Months"];
export type DurationType = (typeof durationTypes)[number];

const meetingTypes = ["OneOnOne_TwoWay", "OneOnOne_OneWay"];
export type MeetingType = (typeof meetingTypes)[number];

const meetingStatuses = ["Pending", "Accepted", "Declined", "Cancelled"];
export type MeetingStatusType = (typeof meetingStatuses)[number];

const ageVerifyStatus = [
	"PENDING",
	"APPROVED",
	"REJECTED",
	"CANCELLED",
] as const;
export type AgeVerifyStatus = (typeof ageVerifyStatus)[number];

export const postReportFlags = [
	"ILLEGAL_CONTENT",
	"UNDERAGE_CONTENT",
	"GRAPHIC_VOILENCE_OR_GORE",
	"HARASSMENT_OR_BULLYING",
	"SELF_HARM_OR_SUICIDE_CONTENT",
	"NON_CONSENSUAL_CONTENT",
	"SPAM_OR_SCAM",
	"INFRINGEMENT_OF_MY_COPYRIGHT",
	"OTHER",
] as const;
export type PostReportFlag = (typeof postReportFlags)[number];

export const storyReportFlags = [
	"ILLEGAL_CONTENT",
	"UNDERAGE_CONTENT",
	"GRAPHIC_VOILENCE_OR_GORE",
	"HARASSMENT_OR_BULLYING",
	"SELF_HARM_OR_SUICIDE_CONTENT",
	"NON_CONSENSUAL_CONTENT",
	"SPAM_OR_SCAM",
	"INFRINGEMENT_OF_MY_COPYRIGHT",
	"OTHER",
] as const;
export type StoryReportFlag = (typeof storyReportFlags)[number];

export const profileReportFlags = [
	"ILLEGAL_CONTENT",
	"UNDERAGE_USER",
	"IMPERSONATION_OR_IDENTITY_THEFT",
	"PROMOTING_HATE_SPEECH_OR_DISCRIMINATION",
	"PROMOTING_DANGEROUS_BEHAVIORS",
	"INVOLVED_IN_SPAN_OR_SCAM_ACTIVITIES",
	"INFRINGEMENT_OF_MY_COPYRIGHT",
	"OTHER",
] as const;

export type ProfileReportFlag = (typeof profileReportFlags)[number];

export const transactionStatuses = [
	"Initialized", // The transaction has been created but not yet submitted
	"Submitted", // The transaction has been submitted but not yet confirmed by the payment provider
	"Pending", // The transaction has been confirmed by the payment provider and is waiting to be processed
	"Successful", // The transaction was processed successfully
	"Failed", // The transaction failed due to an error
	"Refunded", // The transaction was successful, but was later refunded
	"Disputed", // The transaction is under dispute
	"Reversed", // The transaction was reversed by the payment provider
	"Cancelled", // The transaction was cancelled by the user or system
] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

export const subscriptionStatuses = [
	"Initialized",
	"Submitted",
	"Pending",
	"Active",
	"Paused",
	"Terminated",
	"Failed",
	"Refunded",
	"Disputed",
	"Reversed",
	"Cancelled",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const spendingTypes = ["Tip", "Cameo"] as const;
export type SpendingType = (typeof spendingTypes)[number];

export const paymentProviders = [
	"Stripe",
	"PayPal",
	"AuthorizeNet",
	"Bank",
] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export const creatorReferralTransactionTypes = [
	"Tip",
	"Subscription",
	"PaidPost",
] as const;

export type CreatorReferralTransactionType =
	(typeof creatorReferralTransactionTypes)[number];

export const fanReferralTransactionTypes = [
	"Tip",
	"Subscription",
	"PaidPost",
] as const;

export type FanReferralTransactionType =
	(typeof fanReferralTransactionTypes)[number];

// This is a bitfield
export enum ProfileFlags {
	VERIFIED = 1 << 0,
	STAFF = 1 << 1,
}

export interface IPostAdvanced {
	isHideLikeViewCount: boolean;
	isTurnOffComment: boolean;
	isPaidLabelDisclaimer: boolean;
}

export interface MessageRespBody {
	message: string;
}

export interface IProfileInfoMinimal {
	id: string;
	linkname: string;
}

export interface IUser {
	id: string;
	type: UserType;
	avatar: string | null;
	username: string;
	displayName: string | null;
	phonenumber: string | null;
	email: string | null;
	country?: string;
	language: LanguageType;
	gender?: GenderType;
	birthdate?: string;
	verifiedAt?: string;
	activeUserListId?: string;
	createdAt?: string;
	updatedAt?: string;
	ageVerifyId?: string;
	ageVerifyStatus?: AgeVerifyStatus;
	isShowProfile?: boolean;
}

export interface IUserBasic {
	id: string;
	username: string;
	displayName: string | null;
	avatar: string | null;
}

export interface IBalance {
	id: string;
	profileId: string;
	amount: number;
	currency: string;
	updatedAt: string;
}

export interface IGemsSpendingLog {
	id: string;
	spenderId: string;
	creatorId: string;
	type: SpendingType;
	amount: number;
	platformFee: number;
	currency: string;
	fanReferralCode?: string;
	updatedAt: string;
}

export interface IGemsBalance {
	id: string;
	userId: string;
	amount: number;
	currency: string;
	updatedAt: string;
}

export interface IGemTransaction {
	id: string;
	balanceId: string;
	userId: string;
	provider: PaymentProvider;
	transactionId?: string;
	amount: number;
	processingFee: number;
	platformFee: number;
	currency: string;
	status: TransactionStatus;
	error?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IPaymentMethod {
	id: string;
	userId: string;
	provider: PaymentProvider;
	token: string;
	createdAt: string;
	updatedAt: string;
}

export interface IPaymentSubscription {
	id: string;
	userId: string;
	creatorId: string;
	paymentMethodId?: string;
	paymentProfileId?: string;
	subscriptionId?: string;
	tierId?: string;
	bundleId?: string;
	campaignId?: string;
	transactionId?: string;
	provider?: PaymentProvider;
	interval?: number;
	startDate: string;
	endDate?: string;
	amount: number;
	processingFee: number;
	platformFee: number;
	currency: string;
	status: SubscriptionStatus;
	error?: string;
	fanReferralCode?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IPaymentSubscriptionTransaction {
	id: string;
	userId: string;
	creatorId: string;
	paymentSubscriptionId: string;
	transactionId?: string;
	amount: number;
	currency: string;
	status: TransactionStatus;
	error?: string;
	createdAt: string;
}

export interface IUserLevel {
	id: string;
	xp: number;
	level: number;
	label?: string;
	userId: string;
	updatedAt: string;
}

export interface IXPAction {
	id: string;
	action: string;
	xp: number;
	type: XPActionType;
	updatedAt: string;
}

export interface IApplication {
	id: string;
	userId: string;
	name: string;
	token: string;
	icon?: string;
	createdAt: string;
}

export interface ICategory {
	id: string;
	profileId: string;
	name: string;
	isActive: boolean;
	updatedAt: string;
	postCount?: number;
}

export interface IMedia {
	id: string;
	type: UploadType;
	url?: string;
	blurhash?: string;
	origin?: string;
	isPinned: boolean;
	updatedAt: string;
}

export interface IPlayList {
	id: string;
	profileId: string;
	title: string;
	description?: string | null;
	thumb: string;
	isPrivate: boolean;
	viewCount: number;
	updatedAt: string;
}

export interface IPlaylistPost {
	id: string;
	playlistId: string;
	postId: string;
}

export interface IPlaylistUpload {
	id: string;
	playlistId: string;
	uploadId: string;
}

export interface Media {
	id: string;
	url?: string;
	thumb?: string;
	blurhash?: string;
}

export interface IPost {
	id: string;
	profileId: string;
	profile?: IProfile;
	title: string | null;
	type: PostType;
	caption: string;
	thumb?: Media;
	medias?: Media[];
	advanced?: IPostAdvanced;
	location?: string;
	isArchived: boolean;
	isHidden: boolean;
	commentCount?: Number;
	likeCount?: Number;
	bookmarkCount?: number;
	createdAt: string;
	updatedAt: string;
	episodeNumber?: number;
	description?: string;
	isPrivate: boolean;
	isNoiseReduction: boolean;
	isAudioLeveling: boolean;
	isPaidPost: boolean;
	isPosted: boolean;
	isPinned: boolean;
	isBookmarked?: boolean;
	isCommented?: boolean;
	isLiked?: boolean;
	isPaidOut?: boolean;
	isSelf?: boolean;
	isExclusive?: boolean;
	shareCount: number;
	imageCount?: number;
	videoLength?: number;
}

export interface IFundraiser {
	id: string;
	postId: string;
	title: string;
	caption: string | null;
	thumb?: Media;
	price: number;
	currency: string;
	endDate: string;
	isXpAdd: boolean;
	updatedAt: string;
}

export interface IGiveaway {
	id: string;
	postId: string;
	prize: string;
	thumb?: Media;
	endDate: string;
	winnerCount: number;
	updatedAt: string;
}

export interface IPaidPost {
	id: string;
	postId: string;
	price: number;
	currency: string;
	thumb?: Media;
	isPinned: boolean;
	isHidden: boolean;
	updatedAt: string;
}

export interface IPoll {
	id: string;
	postId: string;
	question: string;
	caption: string | null;
	thumb?: Media;
	endDate: string;
	isPublic: boolean;
	updatedAt: string;
	answers?: IPollAnswer[];
}

export interface IPollAnswer {
	id: string;
	pollId: string;
	answer: string;
	updatedAt: string;
	voteCount: number;
}

export interface IRole {
	id: string;
	profileId: string;
	name: string;
	color: string;
	icon?: string;
	customIcon?: string;
	level: number;
	updatedAt: string;
}

export interface ISchedule {
	id: string;
	postId: string;
	startDate: string;
	endDate?: string;
	updatedAt: string;
}

export interface IBundle {
	id: string;
	subscriptionId?: string;
	title?: string;
	month?: number;
	discount: number;
	limit: number;
	isActive: boolean;
	updatedAt: string;
}

export interface ICampaign {
	id: string;
	subscriptionId?: string;
	duration?: number;
	durationType?: DurationType;
	endDate?: Date;
	limit: number;
	discount: number;
	type: PromotionType;
	applicable: CampaignType;
	updatedAt: string;
}

export interface ISubscription {
	id: string;
	profileId: string;
	title: string;
	currency: string;
	price: number;
	updatedAt: string;
}

export interface ITier {
	id: string;
	profileId: string;
	title: string;
	price: number;
	currency: string;
	description: string;
	cover: string;
	perks: string[];
	updatedAt: string;
}

export interface ISocialLink {
	id: string;
	provider: string;
	url: string;
	updatedAt: string;
}

export interface IProfile {
	id: string;
	userId: string;
	user?: IUser;
	avatar?: string;
	displayName?: string;
	profileLink?: string;
	bio: string;
	cover: string[];
	flags: number;
	isNSFW: boolean;
	subscriptionType: SubscriptionType;
	migrationLink?: string;
	birthday?: string;
	disabled: boolean;
	location?: string;
	likeCount: number;
	commentCount: number;
	billingPaused?: boolean;
	explicitCommentFilter?: boolean;
	hideComments?: boolean;
	hideLikes?: boolean;
	hideTips?: boolean;
	isPremium?: boolean;
	showProfile?: boolean;
	uploadedVideoDuration: number;
	watermark?: boolean;
	isFanReferralEnabled: boolean;
	fanReferralShare: number;
	marketingContentLink?: string;
	createdAt: string;
	updatedAt: string;
	activeStories?: IStory[];
	isDisplayShop: boolean;
}

export interface IUserlist {
	id: string;
	userId: string;
	title: string;
	updatedAt: string;
	enabled: boolean;
	isActive?: boolean;
}

export interface IPostReport {
	id: string;
	userId: string;
	postId: string;
	flag: PostReportFlag;
	status: ReportStatus;
	reason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IProfileReport {
	id: string;
	userId: string;
	profileId: string;
	flag: ProfileReportFlag;
	status: ReportStatus;
	reason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IComment {
	id: string;
	userId: string;
	postId: string;
	parentCommentId?: string;
	content: string;
	likeCount?: number;
	createdAt: string;
	updatedAt: string;
}

export interface ICommentReport {
	id: string;
	userId: string;
	commentId: string;
	flag: PostReportFlag;
	status: ReportStatus;
	reason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IReply {
	id: string;
	userId: string;
	user: IUser;
	profile?: IProfile;
	postId: string;
	content: string;
	parentCommentId?: string;
	likeCount?: number;
	replyCount?: number;
	createdAt: string;
	updatedAt: string;
	isLiked?: boolean;
	replies: IReply[];
}

export interface IStory {
	id: string;
	profileId: string;
	isHightlight: boolean;
	isArchived: boolean;
	updatedAt: string;
	likeCount?: number;
	commentCount?: number;
	medias: string[];
	isCommented?: boolean;
	isLiked?: boolean;
	shareCount: number;
}

export interface IStoryReport {
	id: string;
	userId: string;
	storyId: string;
	flag: StoryReportFlag;
	status: ReportStatus;
	reason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IUpload {
	id: string;
	userId: string;
	type: UploadType;
	url: string;
	origin?: string;
	completed: boolean;
	isPinned: boolean;
	updatedAt: string;
}

export interface IStoryViewer {
	creatorId: string;
	viewerId: string;
}

export interface IProfilePreview {
	id: string;
	profileId: string;
	url: string;
}

export interface IUserReport {
	id: string;
	creatorId: string;
	userId: string;
	flag: ProfileReportFlag;
	status: ReportStatus;
	reason?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ITaggedPeople {
	id: string;
	postId: string;
	userId: string;
	pointX: number;
	pointY: number;
	updatedAt: string;
}

export interface IHighlight {
	id: string;
	profileId: string;
	title: string;
	cover: string;
	updatedAt: string;
}

export interface IBookmark {
	postId: string;
	userId: string;
}

export interface IConversationMeta {
	id: string;
	name: string;
	icon: string | null;
	otherParticipant?: Partial<IProfile>;
	lastReadMessageId?: string;
	lastMessage?: IMessage;
	isBlocked: boolean;
	isPinned: boolean;
}

export const enum MessageType {
	TEXT = 0,
	IMAGE = 1,
	TIP = 2,
}

export const enum MessageChannelType {
	DIRECT = 0,
}

export interface IMessage {
	id: string;
	channelId: string;
	user: IUserBasic;
	createdAt: string;
	messageType: MessageType;
	content: string;
	emoji?: number;
	images?: string[];
	previewImages?: string;
	value?: number;
	status?: string;
	parentId?: string;
	parentMessage?: IMessage;
}

export interface PaymentMethod {
	customerPaymentProfileId: string;
	cardNumber: string;
	expirationDate: string;
	cardType: string;
}

export interface IOAuth2LinkedAccount {
	id: string;
	userId: string;
	provider: string;
	accountId: string;
	name: string;
	email: string;
	avatarUrl?: string;
}

export interface IStoryComment {
	id: string;
	storyId: string;
	userId: string;
	parentCommentId?: string;
	content: string;
	likeCount?: number;
	replyCount?: number;
	isLiked?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface IStoryReply {
	id: string;
	userId: string;
	user: IUser;
	storyId: string;
	content: string;
	parentCommentId?: string;
	likeCount?: number;
	replyCount?: number;
	isLiked?: boolean;
	createdAt: string;
	updatedAt: string;
	replies: IStoryReply[];
}

export interface IStoryCommentLike {
	storyCommentId: string;
	userId: string;
	updatedAt: string;
}

// Do not reorder/reassign values, only add new ones
// Gaps between values are allowed
export enum NotificationType {
	LikeComment = 1,
	LikePost = 2,
	ViewedPost = 3,
	MadeComment = 4,
	MentionPost = 5,
	PaidPostPurchase = 6,
	Tips = 37,
	TipsOnPost = 6,
	TipsOnChat = 7,
	CongratsRevenue = 8,
	CongratsFollowers = 9,
	WarningPostUnderReview = 10,
	WarningGuidelinesViolation = 11,
	WarningTOSViolation = 12,
	UnreadMessage = 13,
	SubscriptionCharged = 14,
	SubscriptionSubscribed = 15,
	SubscriptionRenewed = 16,
	SubscriptionRenewedCreator = 38,
	SubscriptionRenewedFan = 39,
	SubscriptionCancelled = 17,
	SubscriptionExpiring = 18,
	SubscriptionExpired = 19,
	OrderCustomVideo = 20,
	VideoCallPurchase = 21,
	VideoCallSchedule = 22,
	FanChangedSubscriptionPrice = 23,
	FanRunningPromotion = 24,
	FanSubscriptionExpired = 25,
	FanSubscriptionRenewed = 26,
	FanSubscriptionExpire = 27,
	FanUploadPost = 28,
	FanStartGiveaway = 29,
	FanStartFundraising = 30,
	FanAcceptVideoCall = 31,
	FanLikeComment = 32,
	ReplyComment = 33,
	FanSentTips = 34,
	FanVideoCallSchedule = 35,
	FanCongrats = 36,
	ChargebackNoticeCreator = 40,
	ChargebackNoticeFan = 41,
}

export interface INotification {
	id: string;
	read?: boolean;
	type: NotificationType;
	users?: IUserBasic[];
	comment?: IComment;
	post?: IPost;
	creator?: IProfile;
	role?: IRole;
	amount?: number;
	price?: string;
	text?: string;
	time?: string;
	mailto?: string;
	link?: string;
	timeLeft?: string;
	postImage?: string;
	rejected?: boolean;
	accepted?: boolean;
	strike?: number;
	from?: string;
	to?: string;
}

export interface IStripeForm {
	firstName: string;
	lastName: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	zip: string;
	bankRoutingNumber: string;
	bankAccountNumber: string;
}

export interface Bundle {
	id: string;
	month: number;
	discount: number;
	price?: number;
}

export interface Subscription {
	id: number;
	subscriptionId?: number;
	tierId?: number;
	error: string;
	status: string;
	amount: number;
	startDate: string;
	endDate: string;
	creator: IProfile;
	subscription?: {
		id: string;
		price: number;
		bundles?: Bundle[];
	};
	bundle?: Bundle;
	tier?: {
		id: string;
		price: number;
	};
}

export interface IPopupStatus {
	showNoticeChargeBackDialog: boolean;
	showFairTransactionDialog: boolean;
	showManageSubscriptionDialog: boolean;
	paymentSubscription: Subscription;
}

export interface ICreatorReferral {
	id: string;
	profileId: string;
	code: string;
	visitCount: number;
	updatedAt: Date;
}

export interface ICreatorReferralTransaction {
	id: string;
	referentId: string;
	referrerId: string;
	type: CreatorReferralTransactionType;
	transactionId: string;
	amount: number;
	updatedAt: Date;
}

export interface IPayoutLog {
	id: string;
	profileId: string;
	payoutPaymentMethodId: string;
	amount: number;
	processingFee: number;
	currency: string;
	status: TransactionStatus;
	createdAt: string;
	updatedAt: string;
}

export interface IFanReferral {
	id: string;
	profileId: string;
	userId: string;
	code: string;
	updatedAt: string;
}

export interface IFanReferralTransaction {
	id: string;
	referentId: string;
	creatorId: string;
	referrerId: string;
	fanReferralId: string;
	type: FanReferralTransactionType;
	transactionId: string;
	amount: number;
	updatedAt: string;
}

export interface IMeeting {
	id: string;
	hostId: string;
	startDate: Date;
	endDate: Date;
	status: MeetingStatusType;
}

export interface IMeetingDuration {
	id: string;
	length: number;
	price: number;
	currency: string;
	isEnabled: boolean;
}

export interface IMeetingInterval {
	id: string;
	startTime: string;
	day: number;
	length: number;
}

export interface IMeetingVacation {
	id: string;
	startDate: Date;
	endDate: Date;
}

export interface ICameoDuration {
	id: string;
	length: number;
	price: number;
	currency: string;
	isEnabled: boolean;
}
