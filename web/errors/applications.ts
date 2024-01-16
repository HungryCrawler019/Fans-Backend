import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const applicationsAPIErrors = {
	TOO_MANY_APPLICATIONS: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Applications, 1),
			message: "Too many applications.",
		},
	},
	TOO_MANY_WEBHOOKS: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Applications, 2),
			message: "Too many webhooks.",
		},
	},
	APPS_NOT_A_CREATOR: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Applications, 3),
			message: "Only creators can create apps.",
		},
	},
	APPLICATION_DELETION_FAILED: {
		status: 500,
		data: {
			code: errorCode(ErrorSource.Applications, 4),
			message: "Failed to delete application.",
		},
	},
	APPLICATION_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Applications, 5),
			message: "Unknown app ID.",
		},
	},
};
