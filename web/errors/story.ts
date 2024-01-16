import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const storyAPIErrors = {
	ALREADY_LIKE_STORY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Story, 1),
			message: "You liked this story already.",
		},
	},
	NOT_LIKE_STORY_YET: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Story, 2),
			message: "You didn't like this story yet.",
		},
	},
	ALREADY_HIDDEN_STORY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Story, 3),
			message: "You hidden this story already.",
		},
	},
};
