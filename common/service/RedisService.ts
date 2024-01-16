import { Injectable } from "async-injection";
import { Redis as IORedis, SentinelAddress } from "ioredis";
import { splitHostPort } from "../utils/Common.js";

@Injectable()
class RedisService extends IORedis {
	constructor(
		redisDsn: string = "",
		sentinels: SentinelAddress[] = [],
		sentinelMasterName?: string,
		sentinelPassword?: string,
	) {
		super(redisDsn, {
			sentinels: sentinels.length > 0 ? sentinels : undefined,
			sentinelPassword,
			name: sentinelMasterName,
			lazyConnect: true,
			autoResubscribe: true,
			autoResendUnfulfilledCommands: true,
			enableOfflineQueue: true,
			enableReadyCheck: true,
			maxRetriesPerRequest: null,
		});
	}
}

export async function redisFactory(): Promise<RedisService> {
	const redisDsn = process.env.REDIS_DSN;

	const sentinels: SentinelAddress[] = [];
	const redisSentinels = process.env.REDIS_SENTINELS;
	const sentinelMasterName = process.env.REDIS_SENTINEL_MASTER_NAME;
	const sentinelPassword = process.env.REDIS_SENTINEL_PASSWORD;
	if (redisSentinels) {
		const sentinelsStr = redisSentinels.split(",");
		for (const sentinelStr of sentinelsStr) {
			const [host, port] = splitHostPort(sentinelStr, 26379);
			sentinels.push({ host, port });
		}
	}

	if (sentinels.length === 0 && !redisDsn) {
		throw new Error("Missing REDIS_DSN environment variable");
	}

	const redis = new RedisService(
		redisDsn,
		sentinels,
		sentinelMasterName,
		sentinelPassword,
	);
	await redis.connect();
	return redis;
}

export default RedisService;
