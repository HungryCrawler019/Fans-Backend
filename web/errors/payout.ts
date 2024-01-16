import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const payoutAPIErrors = {
	PAYOUT_SCHEDULE_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 33),
			message: "Payout schedule not found.",
		},
	},
	PAYMENT_METHODS_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 34),
			message: "Payment methods not found.",
		},
	},
	PAYMENT_METHOD_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 35),
			message: "Payment method not found.",
		},
	},
	PENDING_PAYOUT: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 36),
			message: "You already have a pending payout.",
		},
	},
	INSUFFICIENT_BALANCE: (amount: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 37),
			message: `Insufficient balance. You need at least $${amount} to send a payout.`,
		},
	}),
	AGE_VERIFICATION_REQUIRED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 38),
			message: "Age verification required.",
		},
	},
	MAX_PAYOUT_EXCEEDED: (maxPayout: number) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 39),
			message: `Max payout exceeded. You can send a maximum of $${maxPayout} per payout.`,
		},
	}),
	MIN_PAYOUT_NOT_MET: (minPayout: number) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 40),
			message: `Min payout not met. You need at least $${minPayout} to send a payout.`,
		},
	}),
};
