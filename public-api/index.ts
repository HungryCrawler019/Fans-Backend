import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Container } from "async-injection";
import Fastify from "fastify";
import { Logger } from "pino";
import APIErrorPlugin from "../common/fastifyPlugins/APIErrorPlugin.js";
import DependencyInjectionPlugin from "../common/fastifyPlugins/DependencyInjectionPlugin.js";
import RedisService from "../common/service/RedisService.js";

export default async function main(container: Container) {
	container = container.clone();

	const logger = await container.resolve<Logger>("logger");
	const redis = await container.resolve(RedisService);

	const host = process.env.HOST_PUBLIC_API ?? "::";
	const port = Number(process.env.PORT_PUBLIC_API ?? 4003);

	const fastify = Fastify({
		logger,
	}).withTypeProvider<TypeBoxTypeProvider>();

	// this must be the first thing registered in order to use DI in routes
	await fastify.register(APIErrorPlugin);
	await fastify.register(DependencyInjectionPlugin, { container });
	// await fastify.register(SessionManagerPlugin);

	fastify.register(fastifyCors);

	fastify.register(fastifyRateLimit.fastifyRateLimit, {
		redis,
		nameSpace: "fyp:public-api:rate-limit:",
	});

	fastify.get("/api/health", (_req, reply) => {
		reply.send({ status: "ok" });
	});

	await fastify.listen({
		host,
		port,
		listenTextResolver: (addr) => `Public API service listening at ${addr}`,
	});
}
