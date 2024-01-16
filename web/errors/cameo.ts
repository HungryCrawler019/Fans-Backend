import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const cameoAPIErrors = {
	CAMEO_DURATION_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Cameo, 1),
			message: "No duration with the provided id found",
		},
	},
	CAMEO_DURATION_CONFLICT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Cameo, 2),
			message: "Duration already exists",
		},
	},
	CAMEO_SETTINGS_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Cameo, 3),
			message: "Cameo settings not found",
		},
	},
};
