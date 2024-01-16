import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const gemsAPIErrors = {
	INSUFFICIENT_GEMS: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Gems, 1),
			message: "Insufficient gems.",
		},
	},
	INVALID_AMOUNT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Gems, 2),
			message: "Invalid amount provided",
		},
	},
};
