import { Injectable, Injector } from "async-injection";

/**
 * A distributed ID generator implementing Twitter snowflake specification.
 */
@Injectable()
class ScraperService {
	readonly #scraperApiUrl: string;

	constructor(scraperApiUrl: string) {
		this.#scraperApiUrl = scraperApiUrl;
	}

	private async request<TResponse>(
		url: string,
		config: RequestInit = {},
	): Promise<TResponse> {
		return fetch(url, config)
			.then((response) => response.json())
			.then((data) => data as TResponse);
	}

	async onlyfans(url: string): Promise<ScrapeOnlyfansRespBody> {
		return await this.request<ScrapeOnlyfansRespBody>(
			`${this.#scraperApiUrl}onlyfans`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url }),
			},
		);
	}

	async patreon(url: string): Promise<ScrapePatreonRespBody> {
		return await this.request<ScrapePatreonRespBody>(
			`${this.#scraperApiUrl}patreon`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url }),
			},
		);
	}
}

export interface ScrapeOnlyfansRespBody {
	url: string;
	isVerified: boolean;
	avatar: string;
	banner: string;
	name: string;
	username: string;
	subscribePrice: number;
	description: string;
	favoritedCount: number;
	photosCount: number;
	videosCount: number;
}

export interface ScrapePatreonRespBody {
	url: string;
	profile_image: string;
	banner: string;
	name: string;
	description: string;
}

export async function scraperFactory(): Promise<ScraperService> {
	if (!process.env.EMBED_SCRAPER_API_URL) {
		throw new Error("Missing embed scraper API url for embeded scraper");
	}
	const scraperApiUrl = process.env.EMBED_SCRAPER_API_URL;
	return new ScraperService(scraperApiUrl);
}

export default ScraperService;
