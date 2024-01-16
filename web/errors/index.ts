import { authAPIErrors } from "../../common/APIErrors/auth.js";
import { genericAPIErrors } from "../../common/APIErrors/generic.js";
import { dupeCheck } from "../../common/APIErrors/index.js";
import { applicationsAPIErrors } from "./applications.js";
import { chatAPIErrors } from "./chat.js";
import { commentAPIErrors } from "./comment.js";
import { gemsAPIErrors } from "./gems.js";
import { paymentAPIErrors } from "./payment.js";
import { payoutAPIErrors } from "./payout.js";
import { postAPIErrors } from "./post.js";
import { profileAPIErrors } from "./profile.js";
import { settingsAPIErrors } from "./settings.js";
import { storyAPIErrors } from "./story.js";
import { uploadAPIErrors } from "./upload.js";
import { userlistAPIErrors } from "./userlist.js";
import { userAPIErrors } from "./user.js";
import { pollAPIErrors } from "./poll.js";
import { videocallAPIErrors } from "./videocall.js";
import { cameoAPIErrors } from "./cameo.js";

const APIErrors = {
	...genericAPIErrors,
	...authAPIErrors,
	...applicationsAPIErrors,
	...chatAPIErrors,
	...commentAPIErrors,
	...gemsAPIErrors,
	...payoutAPIErrors,
	...paymentAPIErrors,
	...profileAPIErrors,
	...settingsAPIErrors,
	...postAPIErrors,
	...storyAPIErrors,
	...uploadAPIErrors,
	...userlistAPIErrors,
	...userAPIErrors,
	...pollAPIErrors,
	...videocallAPIErrors,
	...cameoAPIErrors,
};

dupeCheck(APIErrors);

export default APIErrors;
