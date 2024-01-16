import { Injectable, Injector } from "async-injection";
import axios from "axios";
import { RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import { Logger } from "pino";
import qs from "qs";

export interface IOAuth2GenericUser {
	provider: string;
	id: string;
	email: string;
	name: string;
	avatarUrl?: string;
	accessToken: string;
	refreshToken?: string;
}

export abstract class BaseProvider {
	static providerName: string;
	clientID: string;
	clientSecret?: string;
	requiredScopes: string[];
	getTokenURL: string;

	public constructor(clientID: string, clientSecret?: string) {
		this.clientID = clientID;
		this.clientSecret = clientSecret;
	}

	/**
	 * Returns generalised user info using the access token.
	 * @param accessToken The access token.
	 * @returns {Promise<IOAuth2GenericUser>} The generalised user info.
	 */
	abstract getUserWithAccessToken(
		accessToken: string,
		refreshToken?: string,
	): Promise<IOAuth2GenericUser>;

	/**
	 * Returns generalised user info using the post-authentication code.
	 * @param redirectUri The redirect URI used while initiating the authentication.
	 * @param code The post-authentication code.
	 * @returns {Promise<IOAuth2GenericUser>} The generalised user info.
	 */
	abstract getUserWithCode(
		redirectUri: string,
		code: string,
		codeVerifier?: string,
	): Promise<IOAuth2GenericUser>;
}

class DiscordProvider extends BaseProvider {
	static providerName = "discord";

	public constructor(clientID: string, clientSecret?: string) {
		super(clientID, clientSecret);
		this.requiredScopes = ["identify", "email"];
		this.getTokenURL = "https://discord.com/api/v10/oauth2/token";
	}

	async getUserWithAccessToken(
		accessToken: string,
		refreshToken?: string,
	): Promise<IOAuth2GenericUser> {
		const resp = await axios.get("https://discord.com/api/v10/users/@me", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (resp.status !== 200) {
			throw new Error("Failed to get user info");
		}

		const body = resp.data as {
			id: string;
			username: string;
			discriminator: string;
			global_name?: string;
			email?: string;
			verified: boolean;
			avatar?: string;
		};

		console.log("oauth2", body);

		if (!body.verified || !body.email) {
			throw new Error(
				"The email must be verified in order to authenticate",
			);
		}

		const name = body.global_name
			? body.global_name
			: body.discriminator === "0"
			? body.username
			: `${body.username}#${body.discriminator}`;

		return {
			provider: "discord",
			id: body.id,
			email: body.email,
			name,
			avatarUrl: `https://cdn.discordapp.com/avatars/${body.id}/${body.avatar}.png?size=128`,
			accessToken,
			refreshToken,
		};
	}

	async getUserWithCode(
		redirectUri: string,
		code: string,
		codeVerifier?: string,
	): Promise<IOAuth2GenericUser> {
		// Gets an oauth2 token
		const resp = await axios.post(
			this.getTokenURL,
			qs.stringify({
				client_id: this.clientID,
				client_secret: this.clientSecret,
				code: code,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
				code_verifier: codeVerifier,
				scope: this.requiredScopes.join(" "),
			}),
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get Discord access token");
		}

		const body = resp.data as RESTPostOAuth2AccessTokenResult;
		const scopes: string[] = (body.scope ?? "").split(" ");

		// Ensures we have proper scopes returned
		for (const scope of this.requiredScopes) {
			if (!scopes.includes(scope)) {
				throw new Error("Missing required scopes");
			}
		}

		// Sets the access token
		const accessToken = body.access_token;
		if (!accessToken) {
			throw new Error("Missing access token");
		}

		return await this.getUserWithAccessToken(
			accessToken,
			body.refresh_token,
		);
	}
}

class GoogleProvider extends BaseProvider {
	static providerName = "google";

	public constructor(clientID: string, clientSecret?: string) {
		super(clientID, clientSecret);
		this.requiredScopes = [
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		];
		this.getTokenURL = "https://oauth2.googleapis.com/token";
	}

	/**
	 * Returns generalised user info using the post-authentication code.
	 * @param redirectUri The redirect URI used while initiating the authentication.
	 * @param code The post-authentication code.
	 * @returns {Promise<IOAuth2GenericUser>} The generalised user info.
	 */
	async getUserWithCode(
		redirectUri: string,
		code: string,
		codeVerifier?: string,
	): Promise<IOAuth2GenericUser> {
		const resp = await axios.post(
			this.getTokenURL,
			qs.stringify({
				client_id: this.clientID,
				client_secret: this.clientSecret,
				code: code,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
				code_verifier: codeVerifier,
			}),
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get access token");
		}

		const body = resp.data;

		const scopes: string[] = (body.scope ?? "").split(" ");

		for (const scope of this.requiredScopes) {
			if (!scopes.includes(scope)) {
				throw new Error("Missing required scopes");
			}
		}

		const accessToken = body.access_token;

		if (!accessToken) {
			throw new Error("Missing access token");
		}

		return await this.getUserWithAccessToken(accessToken);
	}

	async getUserWithAccessToken(
		accessToken: string,
		refreshToken?: string,
	): Promise<IOAuth2GenericUser> {
		const resp = await axios.get(
			"https://www.googleapis.com/oauth2/v2/userinfo",
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get user info");
		}

		const body = resp.data as {
			id: string;
			email: string;
			verified_email: boolean;
			name: string;
			picture?: string;
		};

		console.log("oauth2", body);

		if (!body.verified_email || !body.email) {
			throw new Error(
				"The email must be verified in order to authenticate",
			);
		}

		return {
			provider: "google",
			id: body.id,
			email: body.email,
			name: body.name,
			avatarUrl: body.picture,
			accessToken: accessToken,
		};
	}
}

class GoogleIosProvider extends GoogleProvider {
	static providerName = "google_ios";
}

class GoogleAndroidProvider extends GoogleProvider {
	static providerName = "google_android";
}

class GoogleWebProvider extends GoogleProvider {
	static providerName = "google_web";
}

class TwitterProvider extends BaseProvider {
	static providerName = "twitter";

	public constructor(clientID: string, clientSecret: string) {
		super(clientID, clientSecret);
		this.requiredScopes = ["tweet.read", "users.read"];
		this.getTokenURL = "https://api.twitter.com/2/oauth2/token";
	}

	/**
	 * Returns generalised user info using the post-authentication code.
	 * @param redirectUri The redirect URI used while initiating the authentication.
	 * @param code The post-authentication code.
	 * @returns {Promise<IOAuth2GenericUser>} The generalised user info.
	 */
	async getUserWithCode(
		redirectUri: string,
		code: string,
		codeVerifier?: string,
	): Promise<IOAuth2GenericUser> {
		const resp = await axios.post(
			this.getTokenURL +
				"?" +
				qs.stringify({
					code: code,
					grant_type: "authorization_code",
					client_id: this.clientID,
					client_secret: this.clientSecret,
					redirect_uri: redirectUri,
					code_verifier: codeVerifier,
				}),
			undefined,
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get access token");
		}

		const body = resp.data;
		const scopes: string[] = (body.scope ?? "").split(" ");
		for (const scope of this.requiredScopes) {
			if (!scopes.includes(scope)) {
				throw new Error("Missing required scopes");
			}
		}

		const accessToken = body.access_token;
		if (!accessToken) {
			throw new Error("Missing access token");
		}

		return await this.getUserWithAccessToken(accessToken);
	}

	async getUserWithAccessToken(
		accessToken: string,
		refreshToken?: string,
	): Promise<IOAuth2GenericUser> {
		const resp = await axios.get(
			`https://api.twitter.com/2/users/me?${qs.stringify({
				"user.fields": [
					"id",
					"name",
					"username",
					"profile_image_url",
				].join(","),
			})}`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get user info");
		}

		const body = resp.data.data as {
			id: string;
			name: string;
			username: string;
			profile_image_url?: string;
		};

		return {
			provider: "twitter",
			id: body.id,
			name: body.name,
			email: `@${body.username.toLowerCase()}`,
			avatarUrl: body.profile_image_url,
			accessToken: accessToken,
		};
	}
}

@Injectable()
class OAuth2Service {
	readonly #providers: Map<string, BaseProvider>;

	constructor() {
		this.#providers = new Map();
	}

	registerProvider(name: string, provider: BaseProvider) {
		this.#providers.set(name, provider);
	}

	getProvider(name: string): BaseProvider | undefined {
		return this.#providers.get(name);
	}
}

export async function oAuth2Factory(
	injector: Injector,
): Promise<OAuth2Service> {
	const logger = await injector.resolve<Logger>("logger");
	const oAuth2 = new OAuth2Service();
	const providers = [
		GoogleIosProvider,
		GoogleAndroidProvider,
		GoogleWebProvider,
		TwitterProvider,
		DiscordProvider,
	];

	for (const Provider of providers) {
		const clientIDEnv = `OAUTH2_${Provider.providerName.toUpperCase()}_CLIENT_ID`;
		const clientSecretEnv = !["google_ios", "google_android"].includes(
			Provider.providerName,
		)
			? `OAUTH2_${Provider.providerName.toUpperCase()}_SECRET`
			: undefined;
		const clientID = process.env[clientIDEnv];
		const clientSecret = !["google_ios", "google_android"].includes(
			Provider.providerName,
		)
			? process.env[clientSecretEnv!]
			: undefined;

		if (
			!clientID ||
			(!["google_ios", "google_android"].includes(
				Provider.providerName,
			) &&
				!clientSecret)
		) {
			logger.warn(
				`OAuth2 provider ${Provider.providerName} is not configured`,
			);
			continue;
		}

		const provider = new Provider(clientID, clientSecret);

		oAuth2.registerProvider(Provider.providerName, provider);
	}

	return oAuth2;
}

export default OAuth2Service;
