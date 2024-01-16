import Sentry, { Hub } from "@sentry/node";
import { hasTracingEnabled } from "@sentry/tracing";
import {
	baggageHeaderToDynamicSamplingContext,
	extractTraceparentData,
	isPlainObject,
	isString,
	normalize,
} from "@sentry/utils";
import cookie from "cookie";
import fastify, {
	FastifyError,
	FastifyInstance,
	FastifyPluginAsync,
	FastifyPluginOptions,
	FastifyReply,
	FastifyRequest,
	onRequestHookHandler,
	onResponseHookHandler,
} from "fastify";
import fp from "fastify-plugin";

export const kSentryRequestData = Symbol("kSentryRequestData");
export const kSentryIsAutoSessionTrackingEnabled = Symbol(
	"kSentryIsAutoSessionTrackingEnabled",
);
export const kSentryExtractRequestData = Symbol("kSentryExtractRequestData");
export const kSentryExtractUserData = Symbol("kSentryExtractUserData");
export const kSentryGetTransactionName = Symbol("kSentryGetTransactionName");

export type RequestKeys =
	| "headers"
	| "method"
	| "protocol"
	| "url"
	| "cookies"
	| "query_string"
	| "data";

export type TransactionSource = "url" | "route";

export type RequestData = {
	headers?: FastifyRequest["headers"] | any;
	method?: FastifyRequest["method"] | any;
	protocol?: FastifyRequest["protocol"] | any;
	cookies?: Record<string, string>;
	query_string?: FastifyRequest["query"] | any;
	data?: string;
} & Record<string, any>;

export type UserData = {
	id?: string | number;
	username: string;
	email?: string;
} & Record<string, any>;

function tryToExtractBody(req: FastifyRequest) {
	if (req.body !== undefined) {
		return isString(req.body)
			? req.body
			: JSON.stringify(normalize(req.body));
	}
}

function extractRequestData(
	req: FastifyRequest,
	keys: RequestKeys[],
): RequestData {
	const extracted: RequestData = {};
	for (const key of keys) {
		switch (key) {
			case "headers":
				extracted.headers = req.headers;
				break;
			case "method":
				extracted.method = req.method;
				break;
			case "url":
				{
					const host = req.hostname;
					extracted.url = `${req.protocol}://${host}${req.url}`;
				}
				break;
			case "cookies":
				if (extracted.headers) {
					extracted.cookies = cookie.parse(
						extracted.headers.cookie || "",
					);
				}
				break;
			case "query_string":
				extracted.query_string = req.query;
				break;
			case "data":
				if (req.method === "GET" || req.method === "HEAD") {
					break;
				}
				if (req.body !== undefined) {
					extracted.data = tryToExtractBody(req);
				}
				break;
		}
	}
	return extracted;
}

function extractUserData(request: FastifyRequest) {
	if (!isPlainObject(request.session)) {
		return {};
	}
	const extractedUser: any = {};
	const session = request.session;

	extractedUser.id = session.userId;

	return extractedUser;
}

const getTransactionName = (request: FastifyRequest) => {
	return `${request.method} ${request.routeOptions.url}`;
};

const extractPathForTransaction = (
	request: FastifyRequest,
	getName = getTransactionName,
): [string, TransactionSource] => {
	const name = getName(request);
	const source: TransactionSource = "url";
	return [name, source];
};

const shouldHandleError = (
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply,
) => reply.statusCode >= 500;

const eventProcessor = (
	fastify: FastifyInstance,
	request: FastifyRequest,
	reply: FastifyReply,
	event: Sentry.Event,
) => {
	if (!request[kSentryRequestData]) {
		request[kSentryRequestData] = fastify[kSentryExtractRequestData](
			request,
			[
				"headers",
				"method",
				"protocol",
				"url",
				"cookies",
				"query_string",
				"data",
			],
		);
	} else {
		const { data } = fastify[kSentryExtractRequestData](request, ["data"]);
		if (data) {
			request[kSentryRequestData].data = data;
		}
	}
	event.request = {
		...event.request,
		...request[kSentryRequestData],
	};

	if (!request[kSentryRequestData].user) {
		request[kSentryRequestData].user =
			fastify[kSentryExtractUserData](request);
	}
	event.user = {
		ip_address: request.ip,
		...event.user,
		...request[kSentryRequestData].user,
	};
	if (!event.transaction) {
		if (reply.sentryTransaction) {
			event.transaction = reply.sentryTransaction.name;
		} else {
			event.transaction = fastify[kSentryGetTransactionName](request);
		}
	}
	return event;
};

const tracingRequestHook = (fastify: FastifyInstance): onRequestHookHandler => {
	return function (request, reply, done) {
		const traceparentData =
			request.headers && isString(request.headers["sentry-trace"])
				? extractTraceparentData(request.headers["sentry-trace"])
				: undefined;
		const dynamicSamplingContext =
			request.headers && isString(request.headers.baggage)
				? baggageHeaderToDynamicSamplingContext(request.headers.baggage)
				: undefined;
		// In this hook the body of the request is not available yet,
		// but in the context of a transaction it shouldn't matter.
		// It will be extracted later in the `eventProcessor` to enrich the
		// event.
		const r = fastify[kSentryExtractRequestData](request, [
			"headers",
			"method",
			"protocol",
			"url",
			"cookies",
			"query_string",
		]);
		request[kSentryRequestData] = r;

		const [name, source] = extractPathForTransaction(
			request,
			fastify[kSentryGetTransactionName],
		);
		const transaction = fastify.Sentry!.startTransaction(
			{
				name,
				op: "http.server",
				...traceparentData,
				metadata: {
					dynamicSamplingContext:
						traceparentData && !dynamicSamplingContext
							? {}
							: dynamicSamplingContext,
					request: r,
					source,
				},
			},
			{ request: r },
		);
		reply.sentryTransaction = transaction;
		fastify.Sentry!.getCurrentHub().configureScope((scope) => {
			if (transaction) {
				transaction.setData("url", request.url);
				transaction.setData("query", request.query);
				scope.setSpan(transaction);
			}
		});
		done();
	};
};

const tracingResponseHook = (
	fastify: FastifyInstance,
): onResponseHookHandler => {
	return (request, reply, done) => {
		if (reply.sentryTransaction) {
			if (!request[kSentryRequestData].user) {
				request[kSentryRequestData].user =
					fastify[kSentryExtractUserData](request);
			}
			reply.sentryTransaction.setHttpStatus(reply.statusCode);
			reply.sentryTransaction.finish();
		}
		done();
	};
};

const errorWrapperRequestHook = (
	fastify: FastifyInstance,
): onRequestHookHandler => {
	return (request, reply, done) => {
		fastify.Sentry!.runWithAsyncContext(() => {
			const hub = fastify.Sentry!.getCurrentHub();
			hub.configureScope((scope) => {
				scope.addEventProcessor((event) =>
					eventProcessor(fastify, request, reply, event),
				);
			});
			done();
		});
	};
};

const sentryErrorHandler = function (
	this: FastifyInstance,
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply,
): void {
	if (!shouldHandleError(error, request, reply)) {
		return;
	}

	const fastify = this;
	fastify.Sentry!.withScope((scope) => {
		if (reply.sentryTransaction) {
			if (scope.getSpan() === undefined) {
				scope.setSpan(reply.sentryTransaction);
			}
		}
		reply.sentryEventId = fastify.Sentry!.captureException(error);
	});
};

declare module "fastify" {
	interface FastifyInstance {
		Sentry?: typeof Sentry;
		sentryErrorHandler?: (
			error: FastifyError,
			request: FastifyRequest,
			reply: FastifyReply,
		) => void;

		[kSentryExtractRequestData]: typeof extractRequestData;
		[kSentryExtractUserData]: typeof extractUserData;
		[kSentryGetTransactionName]: typeof getTransactionName;
	}

	interface FastifyRequest {
		[kSentryRequestData]: RequestData;
	}

	interface FastifyReply {
		/** The event id generated by Sentry.captureException */
		sentryEventId: string;
		/** The request transaction (available if tracing is enabled) */
		sentryTransaction: ReturnType<Hub["startTransaction"]> | null;
	}
}

const sentryPlugin: FastifyPluginAsync<FastifyPluginOptions> = async (
	fastify: FastifyInstance,
) => {
	fastify.decorate(kSentryExtractRequestData, extractRequestData);
	fastify.decorate(kSentryExtractUserData, extractUserData);
	fastify.decorate(kSentryGetTransactionName, getTransactionName);
	fastify.decorate("Sentry", Sentry);
	fastify.decorate("sentryErrorHandler", sentryErrorHandler);
	fastify.decorateRequest(kSentryRequestData, null);
	fastify.decorateRequest(kSentryIsAutoSessionTrackingEnabled, false);
	fastify.decorateReply("sentryEventId", "");
	fastify.decorateReply("sentryTransaction", null);
	fastify.addHook("onClose", (instance, done) => {
		Sentry.close(2000).then(() => done(), done);
	});

	if (hasTracingEnabled()) {
		fastify.log.info("Sentry tracing enabled.");
		fastify.addHook("onRequest", tracingRequestHook(fastify));
		fastify.addHook("onResponse", tracingResponseHook(fastify));
	} else {
		fastify.log.info("Sentry tracing not enabled.");
	}
	fastify.addHook("onRequest", errorWrapperRequestHook(fastify));
};

export default fp(sentryPlugin, { fastify: "4.x" });
