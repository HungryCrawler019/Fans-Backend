import { Injectable, Injector } from "async-injection";
import { RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";
import { Logger } from "pino";
import qs from "qs";

export interface IOAuth2GenericUser {
	/**
	 * The provider's name, equal to `BaseProvider.providerName`.
	 */
	provider: string;
	/**
	 * The user's unique ID on the provider.
	 */
	id: string;
	/**
	 * The user's email address.
	 */
	email: string;
	/**
	 * The user's display name.
	 */
	name: string;
	/**
	 * Full URL to the avatar image.
	 */
	avatarUrl?: string;
	/**
	 * Bearer token used to authenticate requests to the provider.
	 */
	accessToken: string;
	/**
	 * Used to refresh the access token. Optional.
	 */
	refreshToken?: string;
	/**
	 * Used by providers that support organizational roles, eg. Okta or Azure AD.
	 */
	roles: string[];
}

export abstract class BaseProvider {
	static providerName: string;
	clientID: string;
	clientSecret?: string;
	requiredScopes: string[];
	getTokenURL: string;
	authorizeURL: string;

	public constructor(clientID: string, clientSecret?: string) {
		this.clientID = clientID;
		this.clientSecret = clientSecret;
		this.requiredScopes = [];
		this.getTokenURL = "";
		this.authorizeURL = "";
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
		this.authorizeURL = "https://discord.com/oauth2/authorize";
	}

	async getUserWithCode(
		redirectUri: string,
		code: string,
		codeVerifier?: string,
	): Promise<IOAuth2GenericUser> {
		const resp = await fetch(
			`${this.getTokenURL}?${qs.stringify({
				client_id: this.clientID,
				client_secret: this.clientSecret,
				code: code,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
				code_verifier: codeVerifier,
				scope: this.requiredScopes.join(" "),
			})}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get Discord access token");
		}

		const body = (await resp.json()) as RESTPostOAuth2AccessTokenResult;
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

	async getUserWithAccessToken(
		accessToken: string,
		refreshToken?: string,
	): Promise<IOAuth2GenericUser> {
		const resp = await fetch("https://discord.com/api/v10/users/@me", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (resp.status !== 200) {
			throw new Error("Failed to get user info");
		}

		const body = (await resp.json()) as {
			id: string;
			username: string;
			discriminator: string;
			global_name?: string;
			email?: string;
			verified: boolean;
			avatar?: string;
		};

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
			provider: DiscordProvider.providerName,
			id: body.id,
			email: body.email,
			name,
			avatarUrl: `https://cdn.discordapp.com/avatars/${body.id}/${body.avatar}.png?size=128`,
			accessToken,
			refreshToken,
			roles: [],
		};
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
		this.authorizeURL = "https://accounts.google.com/o/oauth2/v2/auth";
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
		const resp = await fetch(
			`${this.getTokenURL}?${qs.stringify({
				client_id: this.clientID,
				client_secret: this.clientSecret,
				code: code,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
				code_verifier: codeVerifier,
			})}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get access token");
		}

		const body = await resp.json();

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
		const resp = await fetch(
			"https://www.googleapis.com/oauth2/v2/userinfo",
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get user info");
		}

		const body = (await resp.json()) as {
			id: string;
			email: string;
			verified_email: boolean;
			name: string;
			picture?: string;
		};

		if (!body.verified_email || !body.email) {
			throw new Error(
				"The email must be verified in order to authenticate",
			);
		}

		return {
			provider: GoogleProvider.providerName,
			id: body.id,
			email: body.email,
			name: body.name,
			avatarUrl: body.picture,
			accessToken: accessToken,
			refreshToken: refreshToken,
			roles: [],
		};
	}
}

class TwitterProvider extends BaseProvider {
	static providerName = "twitter";

	public constructor(clientID: string, clientSecret: string) {
		super(clientID, clientSecret);
		this.requiredScopes = ["tweet.read", "users.read"];
		this.getTokenURL = "https://api.twitter.com/2/oauth2/token";
		this.authorizeURL = "https://twitter.com/i/oauth2/authorize";
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
		const resp = await fetch(
			`${this.getTokenURL}?${qs.stringify({
				code: code,
				grant_type: "authorization_code",
				client_id: this.clientID,
				client_secret: this.clientSecret,
				redirect_uri: redirectUri,
				code_verifier: codeVerifier,
			})}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get access token");
		}

		const body = await resp.json();
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
		const resp = await fetch(
			"https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (resp.status !== 200) {
			throw new Error("Failed to get user info");
		}

		const body = (await resp.json()).data as {
			id_str: string;
			name: string;
			screen_name: string;
			profile_image_url_https: string | null;
			email: string | null;
		};

		if (!body.email) {
			throw new Error(
				"Twitter has not provided an email address for this account.",
			);
		}

		return {
			provider: TwitterProvider.providerName,
			id: body.id_str,
			name: body.name,
			email: body.email,
			avatarUrl: body.profile_image_url_https ?? undefined,
			accessToken: accessToken,
			refreshToken: refreshToken,
			roles: [],
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
	const providers = [GoogleProvider, TwitterProvider, DiscordProvider];

	for (const Provider of providers) {
		const clientIDEnv = `OAUTH2_${Provider.providerName.toUpperCase()}_CLIENT_ID`;
		const clientSecretEnv = `OAUTH2_${Provider.providerName.toUpperCase()}_SECRET`;
		const clientID = process.env[clientIDEnv];
		const clientSecret = process.env[clientSecretEnv];

		if (!clientID || !clientSecret) {
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
