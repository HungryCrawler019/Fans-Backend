// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/auth/schemas.ts
// backend: web/routes/auth/schemas.ts

import {
	IFanReferral,
	IOAuth2LinkedAccount,
	IProfile,
	IStoryViewer,
	IUser,
} from "../../CommonAPISchemas.js";

export interface AuthPasswordRegisterReqBody {
	email: string;
	username: string;
}

export interface AuthPasswordVerifyRegisterReqBody {
	email: string;
	code: string;
	username: string;
	password: string;
}

export interface TokenRespBody {
	token: string;
}

export interface AuthPasswordLoginReqBody {
	email: string;
	password: string;
}

export interface AuthForgotPasswordReqBody {
	email: string;
}

export interface AuthVerifyCodeReqBody {
	code: string;
	email: string;
}

export interface AuthResendReqBody {
	email: string;
	username?: string;
}

export interface AuthResetPasswordReqBody {
	email: string;
	password: string;
}

export type AuthUserInfoRespBody = IUser & {
	profile?: IProfile;
	viewedStoryCreators?: IStoryViewer[];
	gems: number;
	gemsAmount: number;
	payoutBalance: number;
	linkedAccounts?: IOAuth2LinkedAccount[];
	fanReferrals?: IFanReferral[];
};

export interface AuthOAuth2AuthorizeReqParams {
	provider: string;
}

export interface AuthOAuth2AuthorizeReqBody {
	code: string;
	redirectUri: string;
	codeVerifier?: string;
}

export interface AuthOAuth2LinkReqParams {
	provider: string;
}

export interface AuthOAuth2LinkReqBody {
	code: string;
	redirectUri: string;
	codeVerifier?: string;
}

export interface AuthOAuth2LinkRespBody {
	linkedAccount: IOAuth2LinkedAccount;
}

export interface AuthOAuth2LinkListRespBody {
	links: {
		[provider: string]: {
			id: string;
			accountId: string;
			email: string;
			name: string;
			avatarUrl?: string;
			linkedAt: string;
		};
	};
}
