import Fastify, {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyPluginOptions,
	FastifyReply,
} from "fastify";
import fp from "fastify-plugin";
import { genericAPIErrors } from "../APIErrors/generic.js";
import { APIError, APIErrorException } from "../APIErrors/index.js";

declare module "fastify" {
	interface FastifyReply {
		sendError(error: APIError): void;
	}
}

const apiErrorPlugin: FastifyPluginAsync<FastifyPluginOptions> = async (
	fastify: FastifyInstance,
) => {
	fastify.decorateReply(
		"sendError",
		function (this: FastifyReply, error: APIError) {
			return this.code(error.status).send(error.data);
		},
	);

	fastify.setErrorHandler((error, request, reply) => {
		if (error instanceof Fastify.errorCodes.FST_ERR_NOT_FOUND) {
			reply.sendError(genericAPIErrors.ENDPOINT_NOT_FOUND);
		} else if (error instanceof Fastify.errorCodes.FST_ERR_VALIDATION) {
			reply.sendError(genericAPIErrors.INVALID_REQUEST(error.message));
		} else if (error instanceof APIErrorException) {
			reply.sendError(error.apiError);
		} else {
			fastify.log.error(error);
			reply.sendError({
				status: error.statusCode ?? 500,
				data: genericAPIErrors.GENERIC_ERROR.data,
			});

			if (fastify.sentryErrorHandler) {
				fastify.sentryErrorHandler(error, request, reply);
			}
		}
	});
};

export default fp(apiErrorPlugin, { fastify: "4.x" });
