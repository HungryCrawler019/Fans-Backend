import { ErrorSource, errorCode } from "./index.js";

export const authAPIErrors = {
	UNAUTHORIZED: {
		status: 401,
		data: { code: errorCode(ErrorSource.Auth, 1), message: "Unauthorized" },
	},
	ALREADY_AUTHORIZED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 2),
			message: "Cannot perform this action while logged in",
		},
	},
	CAPTCHA_REQUIRED: {
		status: 401,
		data: {
			code: errorCode(ErrorSource.Auth, 3),
			message: "Captcha required",
		},
	},
	INVALID_CAPTCHA: {
		status: 401,
		data: {
			code: errorCode(ErrorSource.Auth, 4),
			message: "Invalid captcha answer",
		},
	},
	LOGIN_INVALID_CREDENTIALS: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 5),
			message: "Invalid credentials",
		},
	},
	REGISTER_INVALID_USERNAME: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 6),
			message: "Invalid username",
		},
	},
	REGISTER_INVALID_EMAIL: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 7),
			message: "Invalid email",
		},
	},
	REGISTER_INVALID_PASSWORD: (
		message: string = "Your password must be at least 8 characters long",
	) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 8),
			message,
		},
	}),
	REGISTER_PASSWORD_TOO_LONG: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 9),
			message: "Your password is too long",
		},
	},
	REGISTER_EMAIL_IN_USE: {
		status: 409,
		data: {
			code: errorCode(ErrorSource.Auth, 10),
			message: "This email is already in use",
		},
	},
	USER_NOT_VERIFIED: {
		status: 401,
		data: {
			code: errorCode(ErrorSource.Auth, 11),
			message: "User is not verified yet!",
		},
	},
	PERMISSION_ERROR: {
		status: 403,
		data: {
			code: errorCode(ErrorSource.Auth, 12),
			message: "You have no permission for this action!",
		},
	},
	INVALID_CODE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 13),
			message: "Invalid code",
		},
	},
	OAUTH2_AUTHENTICATION_FAILED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 14),
			message: "OAuth2 authentication failed",
		},
	},
	OAUTH2_INVALID_PROVIDER: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 15),
			message: "Invalid provider",
		},
	},
	OAUTH2_EMAIL_IN_USE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 16),
			message:
				"An account with email linked to this provider already exists. Please login with your email and password and link your account in your account settings. If you didn't set or remember your password, use the reset password option.",
		},
	},
	OAUTH2_ALREADY_LINKED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 17),
			message:
				"This third-party account is already linked to an another user.",
		},
	},
	OAUTH2_NOT_LINKED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 18),
			message: "This third-party account is not linked to any user.",
		},
	},
	OAUTH2_UNABLE_UNLINK_WITHOUT_PASSWORD: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Auth, 19),
			message:
				"This third-party account can't be unlink because user doesn't set password.",
		},
	},
	USER_BANNED: {
		status: 403,
		data: {
			code: errorCode(ErrorSource.Auth, 20),
			message:
				"This account has been banned due to violation of our terms of service.",
		},
	},
};
