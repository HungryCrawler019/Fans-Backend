import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const pollAPIErrors = {
	POLL_IS_VOTED_ALREADY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Poll, 1),
			message: "You already have voted in this poll.",
		},
	},
	POLL_ANSWER_IS_VOTED_ALREADY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Poll, 2),
			message: "You already have answered in this poll.",
		},
	},
	POLL_IS_NOT_VOTED_YET: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Poll, 3),
			message: "You haven't voted in this poll yet.",
		},
	},
	POLL_ANSWER_IS_NOT_VOTED_YET: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Poll, 4),
			message: "You haven't answered in this poll yet.",
		},
	},
};
