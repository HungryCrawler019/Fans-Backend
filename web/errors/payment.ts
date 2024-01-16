import { ErrorSource, errorCode } from "../../common/APIErrors/index.js";

export const paymentAPIErrors = {
	PAYMENT_FAILED: (message: string = "Payment failed") => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 2),
			message,
		},
	}),
	WEBHOOK_STATUS_INACTIVE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 1),
			message: "Systems unavailable, check again later.",
		},
	},
	WEBHOOK_PAYLOAD_MISSING: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 3),
			message: "Webhook payload is missing.",
		},
	},
	WEBHOOK_PAYLOAD_INVALID: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 4),
			message: "Webhook payload is invalid.",
		},
	},
	WEBHOOK_METADATA_MISSING: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 5),
			message: "Webhook metadata is missing.",
		},
	},
	WEBHOOK_TRANSACTION_NOT_FOUND: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 6),
			message: "Webhook transaction not found.",
		},
	},
	WEBHOOK_BALANCE_NOT_FOUND: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 7),
			message: "Webhook balance not found.",
		},
	},
	SUBSCRIPTION_OR_TIER_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 8),
			message: "Subscription not found.",
		},
	},
	PAYMENT_SUBSCRIPTION_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 9),
			message: "Subscription not found.",
		},
	},
	SUBSCRIPTION_ALREADY_EXISTS: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 10),
			message: "Subscription already exists.",
		},
	},
	SUBSCRIPTION_CANCEL_FAILED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 11),
			message: "Failed to cancel subscription.",
		},
	},
	SUBSCRIPTION_ALREADY_CANCELLED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 12),
			message: "Subscription already cancelled.",
		},
	},
	SUBSCRIPTION_NOT_ACTIVE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 13),
			message: "Subscription is not active, and cannot be cancelled.",
		},
	},
	ALREADY_SUBSCRIBED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 14),
			message: "Already subscribed.",
		},
	},
	PAYMENT_METHOD_FETCH_FAILED: (message: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 15),
			message,
		},
	}),
	PAYMENT_METHOD_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 16),
			message: "Payment method not found.",
		},
	},
	NO_PAYMENT_METHOD_FOUND: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 17),
			message: "No payment method found.",
		},
	},
	FETCH_SUBSCRIPTIONS_FAILED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 18),
			message: "Failed to fetch subscriptions.",
		},
	},
	UPDATE_SUBSCRIPTION_PAYMENT_METHOD_FAILED: (message: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 19),
			message,
		},
	}),
	INSUFFICIENT_FUNDS: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 20),
			message: "Insufficient funds.",
		},
	},
	SUBSCRIPTION_NOT_FREE: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 21),
			message: "Subscription is not free.",
		},
	},
	PAYMENT_METHOD_SET_DEFAULT_FAILED: (message: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 22),
			message,
		},
	}),
	PAYMENT_METHOD_DELETE_FAILED: (message: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 23),
			message,
		},
	}),
	POST_ALREADY_PURCHASED: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 24),
			message: "Post already purchased.",
		},
	},
	TIP_SELF: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 25),
			message: "You cannot tip yourself.",
		},
	},
	PURCHASE_POST_SELF: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 26),
			message: "You cannot purchase your own post.",
		},
	},
	SUBSCRIBE_SELF: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 27),
			message: "You cannot subscribe to yourself.",
		},
	},
	TRANSACTION_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 28),
			message: "Transaction not found.",
		},
	},
	REFUND_FAILED: (message: string) => ({
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 29),
			message,
		},
	}),
	CANNOT_REFUND_NOT_SUCCESSFUL: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 30),
			message: "Cannot refund a transaction that is not successful.",
		},
	},
	BALANCE_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 31),
			message: "Balance not found.",
		},
	},
	GEMS_BALANCE_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 32),
			message: "Gems balance not found.",
		},
	},
	SUBSCRIPTION_NOT_FOUND: {
		status: 404,
		data: {
			code: errorCode(ErrorSource.Billing, 41),
			message: "Subscription not found.",
		},
	},
	SUBSCRIPTION_IS_PROCESSING: {
		status: 400,
		data: {
			code: errorCode(ErrorSource.Billing, 42),
			message:
				"Processing last failed transaction, check back in 5 minutes.",
		},
	},
};
