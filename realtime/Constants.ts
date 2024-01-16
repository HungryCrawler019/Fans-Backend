/**
 * Custom close codes for WebSocket connections used in our protocol.
 */
export const CloseReason = {
	InvalidPayload: {
		code: 4000,
		message: "Invalid payload",
	},
	PingTimeout: {
		code: 4001,
		message: "Ping timeout",
	},
	ServerError: {
		code: 4002,
		message: "A server-side error has occurred",
	},
	AuthenticationError: {
		code: 4003,
		message: "Authentication error",
	},
	DisallowedOperation: {
		code: 4004,
		message: "This operation isn't allowed in current session state",
	},
	UnsupportedAPIVersion: {
		code: 4005,
		message: "Unsupported API version",
	},
};
