export type ExplicitCommentFilterReqBody = {
	explicitCommentFilter: boolean;
};

export type HideCommentsReqBody = {
	hideComments: boolean;
};

export type HideLikesReqBody = {
	hideLikes: boolean;
};

export type HideTipsReqBody = {
	hideTips: boolean;
};

export type ShowProfileReqBody = {
	showProfile: boolean;
};

export type WatermarkReqBody = {
	watermark: boolean;
};

export type LimitFuturePaymentParams = {
	creatorId: string;
	userId: string;
};

export type ReferralSetupReqBody = {
	isFanReferralEnabled: boolean;
	fanReferralShare: number;
	marketingContentLink?: string;
};
