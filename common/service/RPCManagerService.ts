import { Injector } from "async-injection";
import RedisService from "./RedisService.js";
import { Json } from "../Types.js";
import { Logger } from "pino";

export type RPCCallback = (data: Json) => void;

class RPCManagerService {
	readonly #redis: RedisService;
	readonly #logger: Logger;

	readonly #subscriptions: Map<string, Set<RPCCallback>>;

	constructor(redis: RedisService, logger: Logger) {
		this.#redis = redis;
		this.#logger = logger;

		this.#subscriptions = new Map();

		this.#redis.on("message", (channel, message) => {
			this.#logger.debug("RPC message received %s %s", channel, message);

			try {
				this.#onMessage(channel, JSON.parse(message));
			} catch (e) {
				this.#logger.error(e, "Failed to handle RPC message");
			}
		});
	}

	public async subscribe(channel: string, callback: RPCCallback) {
		const subscriptions = this.#subscriptions.get(channel) ?? new Set();
		subscriptions.add(callback);
		this.#subscriptions.set(channel, subscriptions);

		await this.#redis.subscribe(channel);
	}

	public async unsubscribe(channel: string, callback: RPCCallback) {
		const subscriptions = this.#subscriptions.get(channel);
		if (!subscriptions) return;

		subscriptions.delete(callback);
		this.#subscriptions.set(channel, subscriptions);

		if (subscriptions.size === 0) {
			await this.#redis.unsubscribe(channel);
			this.#subscriptions.delete(channel);
		}
	}

	public async publish(channel: string, data: Json) {
		await this.#redis.publish(channel, JSON.stringify(data));
	}

	#onMessage(channel: string, message: Json) {
		const subscriptions = this.#subscriptions.get(channel);
		if (!subscriptions) return;

		subscriptions.forEach((callback) => {
			try {
				callback(message);
			} catch (e) {
				this.#logger.error(e, "Failed to handle RPC message");
			}
		});
	}
}

export async function rpcManagerFactory(
	injector: Injector,
): Promise<RPCManagerService> {
	const redis = await injector.resolve(RedisService);
	const logger = await injector.resolve<Logger>("logger");

	return new RPCManagerService(redis, logger);
}

export default RPCManagerService;
