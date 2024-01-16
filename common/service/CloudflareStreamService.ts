import { Injectable, Injector } from "async-injection";
import { DateTime } from "luxon";
import { createPrivateKey, createSign } from "node:crypto";
import { Logger } from "pino";

const notConfiguredError = "CloudflareStreamService not configured";

function toBase64(str: string) {
	return Buffer.from(str, "utf-8").toString("base64");
}

function objectToBase64Url(obj: unknown) {
	return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64url");
}

@Injectable()
class CloudflareStreamService {
	static readonly EXPIRES_TIME_IN_S = 4 * 60 * 60; // 4 hours
	static readonly MAX_VIDEO_DURATION_IN_S = 1 * 60 * 60; // 1 hour

	static expireIn(
		expiresIn: number = CloudflareStreamService.EXPIRES_TIME_IN_S,
	) {
		return Math.floor(Date.now() / 1000) + expiresIn;
	}

	readonly #credentials: {
		accountId: string;
		apiToken: string;
		customerDomain: string;
		jwk: string;
		keyId: string;
	};
	readonly #logger: Logger;

	constructor(
		accountId: string | undefined,
		apiToken: string | undefined,
		customerDomain: string | undefined,
		jwk: string | undefined,
		keyId: string | undefined,
		logger: Logger,
	) {
		if (accountId && apiToken && customerDomain && jwk && keyId) {
			this.#credentials = {
				accountId,
				apiToken,
				customerDomain,
				jwk,
				keyId,
			};
		}

		this.#logger = logger;
	}

	get #accountId() {
		if (!this.#credentials) throw new Error(notConfiguredError);
		return this.#credentials.accountId;
	}

	get #apiToken() {
		if (!this.#credentials) throw new Error(notConfiguredError);
		return this.#credentials.apiToken;
	}

	get #customerDomain() {
		if (!this.#credentials) throw new Error(notConfiguredError);
		return this.#credentials.customerDomain;
	}

	get #jwk() {
		if (!this.#credentials) throw new Error(notConfiguredError);
		return this.#credentials.jwk;
	}

	get #keyId() {
		if (!this.#credentials) throw new Error(notConfiguredError);
		return this.#credentials.keyId;
	}

	/**
	 * Returns a signed video token that can be used to access a video.
	 * @param videoId The ID of the video on Cloudflare Stream
	 * @param expiresAt The time in seconds how long the token is valid
	 * @returns A signed video token
	 */
	getVideoToken(
		videoId: string,
		expiresAt: number = CloudflareStreamService.expireIn(),
	) {
		const jwk = JSON.parse(
			Buffer.from(this.#jwk, "base64").toString("utf-8"),
		);
		const keyId = this.#keyId;

		const headers = {
			alg: "RS256",
			kid: keyId,
		};
		const data = {
			sub: videoId,
			kid: keyId,
			exp: expiresAt,
		};

		const token =
			objectToBase64Url(headers) + "." + objectToBase64Url(data);

		const key = createPrivateKey({
			key: jwk,
			format: "jwk",
		});

		const sign = createSign("RSA-SHA256");
		sign.update(token);
		const signature = sign.sign(key, "base64url");

		const signedToken = token + "." + signature;
		return signedToken;
	}

	/**
	 * Returns a signed video url that can be used to access a private video.
	 * @param videoId The ID of the video on Cloudflare Stream
	 * @param expiresAt The time in seconds how long the url is valid
	 * @returns A signed video url
	 */
	getSignedVideoUrl(
		videoId: string,
		expiresAt: number = CloudflareStreamService.expireIn(),
	) {
		return `https://${this.#customerDomain}/${this.getVideoToken(
			videoId,
			expiresAt,
		)}/manifest/video.mpd`;
	}

	async createTusUpload(
		creatorId: bigint,
		uploadLength: string,
		maxDurationSeconds: number = CloudflareStreamService.MAX_VIDEO_DURATION_IN_S,
	): Promise<{
		uploadUrl: string;
		streamMediaId: string;
	}> {
		const accountId = this.#accountId;
		const apiToken = this.#apiToken;

		const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`;
		const expiry = DateTime.utc().plus({ hours: 4 }).toISO();
		if (!expiry) throw new Error("Failed to generate expiry");

		const uploadMetadata = `requiresignedurls,maxDurationSeconds ${toBase64(
			maxDurationSeconds.toString(),
		)},thumbnailtimestamppct MC41Cg==,expiry ${toBase64(expiry)}`;
		const uploadCreator = creatorId.toString();

		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				Authorization: `bearer ${apiToken}`,
				"Tus-Resumable": "1.0.0",
				"Upload-Length": uploadLength,
				"Upload-Creator": uploadCreator,
				"Upload-Metadata": uploadMetadata,
			},
		});

		const streamMediaId = response.headers.get("stream-media-id");
		if (!streamMediaId) throw new Error("Failed to get stream media id");

		const uploadUrl = response.headers.get("Location");
		if (!response.ok || !uploadUrl)
			throw new Error("Failed to get upload url");

		return {
			uploadUrl,
			streamMediaId,
		};
	}

	async deleteVideo(videoId: string) {
		const accountId = this.#accountId;
		const apiToken = this.#apiToken;

		const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`;

		const response = await fetch(endpoint, {
			method: "DELETE",
			headers: {
				Authorization: `bearer ${this.#apiToken}`,
				"Content-Type": "application/json",
			},
		});
	}
}

export async function cloudflareStreamFactory(injector: Injector) {
	const logger = await injector.resolve<Logger>("logger");
	const accountId = process.env.CF_STREAM_ACCOUNT_ID;
	const apiToken = process.env.CF_STREAM_TOKEN;
	const customerDomain = process.env.CF_STREAM_CUSTOMER_DOMAIN;
	const jwk = process.env.CF_STREAM_JWK;
	const keyId = process.env.CF_STREAM_KEY_ID;

	if (!accountId) logger.warn("CF_STREAM_ACCOUNT_ID not set");
	if (!apiToken) logger.warn("CF_STREAM_TOKEN not set");
	if (!customerDomain) logger.warn("CF_STREAM_CUSTOMER_DOMAIN not set");
	if (!jwk) logger.warn("CF_STREAM_JWK not set");
	if (!keyId) logger.warn("CF_STREAM_KEY_ID not set");

	return new CloudflareStreamService(
		accountId,
		apiToken,
		customerDomain,
		jwk,
		keyId,
		logger,
	);
}

export default CloudflareStreamService;
