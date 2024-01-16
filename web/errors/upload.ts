import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const uploadAPIErrors = {
	UPLOAD_INVALID_TYPE: (message: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Upload, 1),
			message,
		},
	}),
	UPLOAD_INVALID_USAGE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Upload, 2),
			message:
				"Invalid upload usage specified or not supported by this method.",
		},
	},
};
