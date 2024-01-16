import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const postAPIErrors = {
	POST_IS_HIDDEN_ALREADY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Post, 1),
			message: "You have already hidden this post.",
		},
	},
	POST_IS_NOT_HIDDEN_YET: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Post, 2),
			message: "You haven't hidden this post yet.",
		},
	},
	CREATOR_IS_BLOCKED_ALREADY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Post, 3),
			message: "You have already blocked the creator of this post.",
		},
	},
	ALREADY_LIKE_POST: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Post, 5),
			message: "You have already liked this post.",
		},
	},
	NOT_LIKE_POST_YET: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Post, 6),
			message: "You haven't liked this post yet.",
		},
	},
	ALREADY_BOOKMARK_POST: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Post, 7),
			message: "You have already bookmarked this post.",
		},
	},
	NOT_BOOKMARK_POST_YET: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Post, 8),
			message: "You haven't bookmarked this post yet.",
		},
	},
	POST_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Post, 9),
			message: "Post not found.",
		},
	},
	POST_IS_NOT_SCHEDULED: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Post, 10),
			message: "Post is not scheduled.",
		},
	},
};
