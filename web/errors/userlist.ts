import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const userlistAPIErrors = {
	CREATOR_IS_ADDED_ALREADY: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Userlist, 1),
			message: "Creator is already added to user list.",
		},
	},
};
