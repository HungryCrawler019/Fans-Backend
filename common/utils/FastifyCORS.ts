import { FastifyCorsOptions } from "@fastify/cors";

/**
 * Returns the CORS configuration for @fastify/cors plugin.
 * Only used when NODE_ENV is set to "production".
 * Development environment uses a insecure CORS configuration with origin reflection.
 */
export function getFastifyCORSConfig(): FastifyCorsOptions {
	if (process.env.NODE_ENV !== "production") {
		return { origin: true };
	}

	const corsOrigins = process.env.CORS_ORIGINS?.split(",") ?? [];
	if (corsOrigins.length === 0) {
		throw new Error("CORS_ORIGINS is not set");
	}

	const origin = [];
	for (const corsOrigin of corsOrigins) {
		if (
			corsOrigin.startsWith("http://") ||
			corsOrigin.startsWith("https://")
		) {
			origin.push(corsOrigin);
		} else {
			origin.push(`https://${corsOrigin}`);
		}
	}

	return {
		origin,
	};
}
