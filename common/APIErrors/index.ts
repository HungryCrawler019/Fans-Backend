type HTTPStatusCode = 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 500;

export interface APIError {
	status: number;
	data: {
		code: number;
		message: string;
	};
}

export class APIErrorException extends Error {
	readonly apiError: APIError;

	constructor(apiError: APIError) {
		super(apiError.data.message);
		this.apiError = apiError;
	}
}

export const enum ErrorSource {
	Generic = 1,
	Auth = 2,
	Billing = 3,
	Profiles = 4,
	Comment = 5,
	Settings = 6,
	Creator = 7,
	Gems = 8,
	Chat = 9,
	Post = 10,
	Userlist = 11,
	Applications = 12,
	Story = 13,
	Upload = 14,
	User = 15,
	Poll = 16,
	Meeting = 17,
	Cameo = 18,
}

export function errorCode(source: ErrorSource, code: number): number {
	return source * 1000 + code;
}

export function dupeCheck(APIErrors: {
	[key: string]: APIError | ((v: any) => APIError);
}) {
	const knownErrorCodes = new Set<number>();
	for (const [key, value] of Object.entries(APIErrors)) {
		if (typeof value === "object") {
			const code = value.data.code;
			if (knownErrorCodes.has(code)) {
				throw new Error(`Duplicate error code ${code} for ${key}`);
			}
			knownErrorCodes.add(code);
		} else if (typeof value === "function") {
			const evaluated = value("" as any);
			const code = evaluated.data.code;
			if (knownErrorCodes.has(code)) {
				throw new Error(`Duplicate error code ${code} for ${key}`);
			}
		}
	}
}
