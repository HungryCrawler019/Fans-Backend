import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const settingsAPIErrors = {
	INVALID_USERNAME: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Settings, 1),
			message: "Username is invalid.",
		},
	},
	DUPLICATE_USERNAME: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Settings, 2),
			message: "Username is already taken.",
		},
	},
	INVALID_PHONENUMBER: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Settings, 3),
			message: "Phone number is invalid.",
		},
	},
	DUPLICATE_EMAIL: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Settings, 4),
			message: "Email already exists.",
		},
	},
	DUPLICATED_LIMIT_USER: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Settings, 5),
			message: "Limit User is already exists.",
		},
	},
	INCORRECT_PASSWORD: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Settings, 6),
			message: "Incorrect password.",
		},
	},
};
