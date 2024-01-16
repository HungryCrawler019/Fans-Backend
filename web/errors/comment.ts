import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const commentAPIErrors = {
	COMMENT_IS_LIKED_ALREADY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Comment, 1),
			message: "You already liked this comment.",
		},
	},
	COMMENT_IS_NOT_LIKED_YET: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Comment, 2),
			message: "You didn't like this comment yet.",
		},
	},
	NOT_PERMISSION_TO_DELETE_COMMENT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Comment, 3),
			message: "You don't have permission to delete this comment.",
		},
	},
};
