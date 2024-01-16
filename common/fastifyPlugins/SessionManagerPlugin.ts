import {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyPluginOptions,
} from "fastify";
import fp from "fastify-plugin";
import { Session } from "../service/SessionManagerService.js";

declare module "fastify" {
	interface FastifyRequest {
		session: Session | undefined;
		fingerprint?: string;
	}
}

const sessionManagerPlugin: FastifyPluginAsync<FastifyPluginOptions> = async (
	fastify: FastifyInstance,
) => {
	fastify.decorateRequest("session", undefined);
	fastify.decorateRequest("profile", undefined);
};

export default fp(sessionManagerPlugin, { fastify: "4.x" });
