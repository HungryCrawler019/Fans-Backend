import { Injectable, Injector } from "async-injection";
import { Logger } from "pino";

interface OndatoEnvironment {
	idApiUrl: string;
	idvApiUrl: string;
	idvUrl: string;
}

const ondatoEnvironments: Record<string, OndatoEnvironment> = {
	sandbox: {
		idApiUrl: "https://sandbox-id.ondato.com",
		idvApiUrl: "https://sandbox-idvapi.ondato.com",
		idvUrl: "https://sandbox-idv.ondato.com",
	},
	production: {
		idApiUrl: "https://id.ondato.com",
		idvApiUrl: "https://idvapi.ondato.com",
		idvUrl: "https://idv.ondato.com",
	},
};

interface OndatoTokenData {
	access_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

interface OndatoCreateIDV {
	externalReferenceId?: string;
	registration: {
		/**
		 * Date of birth in ISO 8601 format (YYYY-MM-DD)
		 */
		dateOfBirth?: string;
		/**
		 * Email address
		 */
		email?: string;

		/**
		 * First name
		 */
		firstName?: string;

		/**
		 * Last name
		 */
		lastName?: string;

		/**
		 * Middle name
		 */
		middleName?: string;

		/**
		 * Personal code
		 */
		personalCode?: string;

		/**
		 * Phone number
		 */
		phoneNumber?: number;

		/**
		 * Country code in ISO 3166-1 alpha-2 format (e.g. LT)
		 */
		countryCode?: string;
	};
	setupId: string;
	representativeId?: string;
	faceAuthentication?: {
		identityVerificationId: string;
	};
}

interface OndatoCreateIDVResult {
	url: string;
	id: string;
	// kycId: string;
}

@Injectable()
class OndatoService {
	#env: OndatoEnvironment;
	#clientId: string;
	#clientSecret: string;
	#setupId: string;
	#logger?: Logger;
	readonly webhookBasicAuth: string;

	#tokenExpiresAt: Date;
	#accessToken: string;
	#scope: string;

	constructor(
		env: OndatoEnvironment,
		clientId: string,
		clientSecret: string,
		setupId: string,
		webhookBasicAuth: string,
		logger?: Logger,
	) {
		this.#env = env;
		this.#clientId = clientId;
		this.#clientSecret = clientSecret;
		this.#setupId = setupId;
		this.webhookBasicAuth = webhookBasicAuth;
		this.#logger = logger;

		this.#tokenExpiresAt = new Date(0);
		this.#accessToken = "";
		this.#scope = "idv_api kyc_identifications_api";
	}

	async getAccessToken(): Promise<string> {
		if (this.#tokenExpiresAt > new Date()) return this.#accessToken;

		const tokenResp = await fetch(`${this.#env.idApiUrl}/connect/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "client_credentials",
				client_id: this.#clientId,
				client_secret: this.#clientSecret,
				scope: this.#scope,
			}),
		});

		if (!tokenResp.ok) {
			throw new Error(
				`Failed to get access token: ${await tokenResp.text()}`,
			);
		}

		const tokenData = (await tokenResp.json()) as OndatoTokenData;
		this.#accessToken = tokenData.access_token;
		this.#tokenExpiresAt = new Date(
			Date.now() + tokenData.expires_in * 1000,
		);

		this.#logger?.info(
			`Got new Ondato OAuth2 access token, expires at ${this.#tokenExpiresAt.toISOString()}`,
		);

		return this.#accessToken;
	}

	/**
	 * Creates a new Identity Verification (IDV) and returns the URL to redirect the user to.
	 * @param {Omit<OndatoCreateIDV, "setupId">} data the data to create the IDV with
	 * @returns {Promise<string>} the URL to redirect the user to
	 */
	async createIDV(
		data: Omit<OndatoCreateIDV, "setupId">,
	): Promise<OndatoCreateIDVResult> {
		const createData: OndatoCreateIDV = {
			...data,
			setupId: this.#setupId,
		};

		const resp = await fetch(
			`${this.#env.idvApiUrl}/v1/identity-verifications`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${await this.getAccessToken()}`,
				},
				body: JSON.stringify(createData),
			},
		);

		if (!resp.ok) {
			throw new Error(`Failed to create IDV: ${await resp.text()}`);
		}

		const respData = await resp.json();
		console.log(respData);

		const id = respData.id as string;
		// const kycId = respData.kyc.id as string;
		const url = this.#env.idvUrl + "?id=" + id;

		return {
			url,
			id,
			// kycId,
		};
	}
}

export async function ondatoFactory(
	injector: Injector,
): Promise<OndatoService> {
	const logger = await injector.resolve<Logger>("logger");
	const environment = process.env.ONDATO_ENVIRONMENT;
	const clientId = process.env.ONDATO_CLIENT_ID;
	const clientSecret = process.env.ONDATO_CLIENT_SECRET;
	const setupId = process.env.ONDATO_SETUP_ID;
	const webhookBasicAuth = process.env.ONDATO_WEBHOOK_BASIC_AUTH;

	if (!environment) throw new Error("ONDATO_ENVIRONMENT not set");
	if (!clientId) throw new Error("ONDATO_CLIENT_ID not set");
	if (!clientSecret) throw new Error("ONDATO_CLIENT_SECRET not set");
	if (!setupId) throw new Error("ONDATO_SETUP_ID not set");
	if (!webhookBasicAuth) throw new Error("ONDATO_WEBHOOK_BASIC_AUTH not set");

	if (!Object.keys(ondatoEnvironments).includes(environment)) {
		throw new Error(
			"ONDATO_ENVIRONMENT not valid, must be one of: " +
				Object.keys(ondatoEnvironments).join(", "),
		);
	}

	const service = new OndatoService(
		ondatoEnvironments[environment],
		clientId,
		clientSecret,
		setupId,
		webhookBasicAuth,
		logger,
	);

	return service;
}

export default OndatoService;
