import { errorCode, ErrorSource } from "./index.js";

export const genericAPIErrors = {
	CLIENT_ERROR: {
		// Special reserved error code for client-side error
		status: 1000,
		data: {
			code: 0,
			message:
				"A client-side error has occurred while making the request",
		},
	},
	GENERIC_ERROR: {
		status: 500,
		data: {
			code: errorCode(ErrorSource.Generic, 1),
			message: "An unknown error has occurred, please try again later",
		},
	},
	FILL_ALL_FIELDS: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Generic, 2),
			message: "Please fill out all fields",
		},
	},
	INVALID_REQUEST: (message: string = "Invalid request") => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Generic, 3),
			message,
		},
	}),
	ENDPOINT_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Generic, 4),
			message: "Not found",
		},
	},
	USER_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Generic, 10),
			message: "User not found",
		},
	},
	PROFILE_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Generic, 11),
			message: "Profile not found",
		},
	},
	TAKEN_USERNAME: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Generic, 20),
			message: "This username is already taken",
		},
	},
	ITEM_NOT_FOUND: (item: string) => ({
		status: 404,
		data: {
			code: errorCode(ErrorSource.Generic, 21),
			message: `${item} not found!`,
		},
	}),
	ITEM_MISSING: (item: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Generic, 22),
			message: `${item} is missing!`,
		},
	}),
	UPDATE_APP: {
		status: 412,
		data: {
			code: errorCode(ErrorSource.Generic, 23),
			message: "Please update your app",
		},
	},
	OUT_OF_RANGE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Generic, 24),
			message: "Data is required out of range",
		},
	},
	REACHED_MAX_OBJECT_LIMIT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Generic, 25),
			message: "Count of object is reached to max limit.",
		},
	},
	CANNOT_PERFORM_ACTION_ON_SELF: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Generic, 26),
			message: "Cannot perform action on yourself",
		},
	},
};
