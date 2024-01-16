import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const videocallAPIErrors = {
	MEETING_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Meeting, 1),
			message: "No meeting with the provided id found",
		},
	},
	UNRECOGNIZED_MEETING_TYPE: (type: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 2),
			message: `Invalid meeting type: ${type}`,
		},
	}),
	INVALID_MEETING_HOST: (id: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 3),
			message: `Cannot schedule a meeting with the provided host: ${id}`,
		},
	}),
	DURATION_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Meeting, 4),
			message: "No duration with the provided id found",
		},
	},
	DURATION_CONFLICT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 5),
			message: "Duration already exists",
		},
	},
	INTERVAL_CONFLICT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 6),
			message: "Interval intersects with an existing interval",
		},
	},
	INTERVAL_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Meeting, 7),
			message: "No interval with the provided id found",
		},
	},
	INVALID_INTERVAL: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 8),
			message: "Invalid interval",
		},
	},
	INVALID_DURATION: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 9),
			message: "Invalid duration",
		},
	},
	MEETING_CONFLICT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 10),
			message: "Meeting intersects with an existing meeting",
		},
	},
	MEETING_SCHEDULE_MISMATCH: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 11),
			message: "Meeting time does not match with creator schedule",
		},
	},
	INVALID_MEETING_DATE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 12),
			message: "Meeting date is invalid",
		},
	},
	MEETING_SETTINGS_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Meeting, 13),
			message: "Meeting settings not found",
		},
	},
	MEETING_VACATION_CONFLICT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Meeting, 14),
			message: "Meeting conflicts with creator's vacation",
		},
	},
};
