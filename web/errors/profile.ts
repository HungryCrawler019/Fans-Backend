import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";
import { AgeCheckerStatus } from "../../common/service/AgeCheckerService.js";

export const profileAPIErrors = {
	PROFILE_EXIST: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 1),
			message: "Profile already exists on your account.",
		},
	},
	PROFILE_LINK_EXIST: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 2),
			message: "Profile link is already taken.",
		},
	},
	DUPLICATED_AVATAR: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 3),
			message: "Avatar has not been changed.",
		},
	},
	MIGRATION_LINK_INCORRECT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 4),
			message: "Migration link is incorrect.",
		},
	},
	AGE_CHECK_IS_FAILED: (status: AgeCheckerStatus) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 5),
			message: `Age check has failed with status "${status}".`,
		},
	}),
	FILE_MISSING: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Profiles, 6),
			message: "Missing file.",
		},
	},
	USERNAME_IS_TAKEN: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 7),
			message: "This username is taken to other already",
		},
	},
	ALREADY_BLOCKED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 8),
			message: "You blocked this creator already.",
		},
	},
	DUPLICATED_CREATOR_REFERRAL_CODE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Profiles, 9),
			message:
				"The creator referral link that you entered is used already.",
		},
	},
};
