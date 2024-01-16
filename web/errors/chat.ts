import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const chatAPIErrors = {
	CHANNEL_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Chat, 1),
			message: "Channel not found.",
		},
	},
};
