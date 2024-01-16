import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const userAPIErrors = {
	DUPLICATED_FAN_REFERRAL_CODE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.User, 1),
			message: "The fan referral link that you entered is used already.",
		},
	},
};
