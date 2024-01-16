import { Injectable, Injector } from "async-injection";

/**
 * A distributed ID generator implementing Twitter snowflake specification.
 */
@Injectable()
class AgeCheckerService {
	readonly #ageCheckerApiUrl: string;
	readonly #ageCheckerApiKey: string;
	readonly #ageCheckerApiSecret: string;

	constructor(
		ageCheckerApiUrl: string,
		ageCheckerApiKey: string,
		ageCheckerApiSecret: string,
	) {
		this.#ageCheckerApiUrl = ageCheckerApiUrl;
		this.#ageCheckerApiKey = ageCheckerApiKey;
		this.#ageCheckerApiSecret = ageCheckerApiSecret;
	}

	private async request<TResponse>(
		url: string,
		config: RequestInit = {},
	): Promise<TResponse> {
		return fetch(url, config)
			.then((response) => response.json())
			.then((data) => data as TResponse);
	}

	async createRequest(
		data: AgeCheckerCustomerData,
	): Promise<AgeCheckerCreateRequestRespBody> {
		return await this.request<AgeCheckerCreateRequestRespBody>(
			`${this.#ageCheckerApiUrl}create`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					key: this.#ageCheckerApiKey,
					secret: this.#ageCheckerApiSecret,
					data,
				}),
			},
		);
	}
	async checkStatus(uuid: string): Promise<AgeCheckerCheckStatusRespBody> {
		return await this.request<AgeCheckerCheckStatusRespBody>(
			`${this.#ageCheckerApiUrl}status/${uuid}`,
			{ method: "GET" },
		);
	}
}

const ageCheckerStatusTypes = [
	"accepted",
	"denied",
	"signature",
	"photo_id",
	"phone_validation",
	"pending",
	"not_created",
] as const;

export type AgeCheckerStatus = (typeof ageCheckerStatusTypes)[number];

const ageCheckerReasonTypes = [
	"invalid_id",
	"underage",
	"info_missing",
	"info_mismatch",
	"blocked",
	"fake_id",
	"blank_id",
	"expired",
	"selfie_mismatch",
	"selfie_id_missing",
	"selfie_not_provided",
	"sms_failed",
	"both_sides_needed",
];

export type AgeCheckerReason = (typeof ageCheckerReasonTypes)[number];

export interface AgeCheckerCustomerData {
	firstName: string;
	lastName: string;
	address: string;
	city: string;
	state: string;
	zip: string;
	country: string;
	dobDay: number;
	dobMonth: number;
	dobYear: number;
}

export interface AgeCheckerCreateRequestRespBody {
	uuid: string;
	status: AgeCheckerStatus;
}

export interface AgeCheckerCheckStatusRespBody {
	status: AgeCheckerStatus;
	reason: AgeCheckerReason;
	key: string;
	verification: {
		buyer: AgeCheckerCustomerData;
		created: string;
	};
}

export async function ageCheckerFactory(): Promise<AgeCheckerService> {
	if (
		!process.env.AGECHECKER_API_KEY ||
		!process.env.AGECHECKER_API_SECRET ||
		!process.env.AGECHECKER_API_URL
	) {
		throw new Error("Missing AgeChecker API configuration");
	}
	const ageCheckerApiUrl = process.env.AGECHECKER_API_URL;
	const ageCheckerApiKey = process.env.AGECHECKER_API_KEY;
	const ageCheckerApiSecret = process.env.AGECHECKER_API_SECRET;
	return new AgeCheckerService(
		ageCheckerApiUrl,
		ageCheckerApiKey,
		ageCheckerApiSecret,
	);
}

export default AgeCheckerService;
