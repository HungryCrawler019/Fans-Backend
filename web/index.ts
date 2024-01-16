import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Container } from "async-injection";
import Fastify from "fastify";
import multer from "fastify-multer";
import { writeFile } from "node:fs/promises";
import { Logger } from "pino";
import APIErrorPlugin from "../common/fastifyPlugins/APIErrorPlugin.js";
import DependencyInjectionPlugin from "../common/fastifyPlugins/DependencyInjectionPlugin.js";
import SentryPlugin from "../common/fastifyPlugins/SentryPlugin.js";
import SessionManagerPlugin from "../common/fastifyPlugins/SessionManagerPlugin.js";
import RedisService from "../common/service/RedisService.js";
import { getFastifyCORSConfig } from "../common/utils/FastifyCORS.js";
import { ajvSnowflakeFormat } from "../common/validators/validation.js";
import scheduledPost from "./workers/scheduledPost.js";
import scheduledNotification from "./workers/scheduledNotification.js";
import { startWatching } from "./emailTemplates/components/stylesheet.js";
import scheduledMeeting from "./workers/scheduledMeeting.js";

export default async function main(container: Container) {
	container = container.clone();

	const logger = await container.resolve<Logger>("logger");
	const redis = await container.resolve(RedisService);

	await scheduledPost(container);
	await scheduledNotification(container);
	await scheduledMeeting(container);
	await startWatching(container);

	const host = process.env.HOST_API ?? "::";
	const port = Number(process.env.PORT_API ?? 4000);

	const fastify = Fastify({
		logger,
		ajv: {
			customOptions: {
				formats: {
					snowflake: ajvSnowflakeFormat,
				},
			},
		},
		trustProxy: true,
	}).withTypeProvider<TypeBoxTypeProvider>();

	// this must be the first thing registered in order to use DI in routes
	await fastify.register(DependencyInjectionPlugin, { container });
	await fastify.register(APIErrorPlugin);
	await fastify.register(SentryPlugin);
	await fastify.register(SessionManagerPlugin);
	await fastify.register(fastifySwagger, {
		openapi: {
			info: {
				title: "FYP.Fans API",
				description: "Non-public website API documentation",
				version: "0.1.0",
			},
			servers: [
				{
					url: "https://fyp-fans.harvestangels.co",
					description: "Staging server",
				},
				{
					url: "https://fyp.fans",
					description: "Production server",
				},
				{
					url: "http://localhost:4000",
					description: "Local development server",
				},
			],
			components: {
				securitySchemes: {
					apiKey: {
						type: "apiKey",
						name: "authorization",
						in: "header",
					},
				},
			},
		},
	});

	if (process.env.NODE_ENV !== "production") {
		await fastify.register(fastifySwaggerUI, {
			routePrefix: "/docs",
			uiConfig: {
				docExpansion: "full",
				deepLinking: false,
			},
			uiHooks: {
				onRequest: function (request, reply, next) {
					next();
				},
				preHandler: function (request, reply, next) {
					next();
				},
			},
			staticCSP: true,
			transformStaticCSP: (header) => header,
			transformSpecification: (swaggerObject, request, reply) => {
				return swaggerObject;
			},
			transformSpecificationClone: true,
		});
	}

	fastify.register(fastifyCors, getFastifyCORSConfig());

	fastify.register(fastifyRateLimit.fastifyRateLimit, {
		redis,
		nameSpace: "fyp:api:rate-limit:",
	});

	fastify.register(multer.contentParser);

	fastify.register(import("./routes/auth/index.js"), {
		prefix: "/api/v1/auth",
	});

	fastify.register(import("./routes/chat/index.js"), {
		prefix: "/api/v1/chat",
	});

	fastify.register(import("./routes/creator/index.js"), {
		prefix: "/api/v1/creator",
	});

	fastify.register(import("./routes/creator/report/index.js"), {
		prefix: "/api/v1/creator/reports",
	});

	fastify.register(import("./routes/creator/analytics/index.js"), {
		prefix: "/api/v1/creator/analytics",
	});

	fastify.register(import("./routes/settings/index.js"), {
		prefix: "/api/v1/settings",
	});

	fastify.register(import("./routes/media/index.js"), {
		prefix: "/api/v1/media",
	});

	fastify.register(import("./routes/notifications/index.js"), {
		prefix: "/api/v1/notifications",
	});

	fastify.register(import("./routes/categories/index.js"), {
		prefix: "/api/v1/categories",
	});

	fastify.register(import("./routes/user/index.js"), {
		prefix: "/api/v1/users",
	});

	fastify.register(import("./routes/user/fanReferral/index.js"), {
		prefix: "/api/v1/user/fan-referrals",
	});

	fastify.register(import("./routes/profile/index.js"), {
		prefix: "/api/v1/profiles",
	});

	fastify.register(import("./routes/profile/report/index.js"), {
		prefix: "/api/v1/profile/report",
	});

	fastify.register(import("./routes/profile/highlights/index.js"), {
		prefix: "/api/v1/profile/highlights",
	});

	fastify.register(import("./routes/profile/tiers/index.js"), {
		prefix: "/api/v1/profile/tiers",
	});

	fastify.register(import("./routes/profile/subscriptions/index.js"), {
		prefix: "/api/v1/profile/subscriptions",
	});

	fastify.register(
		import("./routes/profile/subscriptions/bundles/index.js"),
		{
			prefix: "/api/v1/profile/subscription/bundles",
		},
	);

	fastify.register(import("./routes/profile/payments/index.js"), {
		prefix: "/api/v1/profile/payments",
	});

	fastify.register(
		import("./routes/profile/subscriptions/campaigns/index.js"),
		{
			prefix: "/api/v1/profile/subscription/campaigns",
		},
	);

	fastify.register(import("./routes/profile/creatorReferral/index.js"), {
		prefix: "/api/v1/profile/creator-referrals",
	});

	fastify.register(import("./routes/post/index.js"), {
		prefix: "/api/v1/posts",
	});

	fastify.register(import("./routes/post/comment/index.js"), {
		prefix: "/api/v1/post/comment",
	});

	fastify.register(import("./routes/post/bookmarks/index.js"), {
		prefix: "/api/v1/post/bookmarks",
	});

	fastify.register(import("./routes/post/comment/report/index.js"), {
		prefix: "/api/v1/post/comment/report",
	});

	fastify.register(import("./routes/post/report/index.js"), {
		prefix: "/api/v1/post/report",
	});

	fastify.register(import("./routes/post/fundraiser/index.js"), {
		prefix: "/api/v1/post/fundraiser",
	});

	fastify.register(import("./routes/post/giveaway/index.js"), {
		prefix: "/api/v1/post/giveaway",
	});

	fastify.register(import("./routes/post/paid-post/index.js"), {
		prefix: "/api/v1/post/paid-post",
	});

	fastify.register(import("./routes/post/poll/index.js"), {
		prefix: "/api/v1/post/poll",
	});

	fastify.register(import("./routes/post/schedule/index.js"), {
		prefix: "/api/v1/post/schedule",
	});

	fastify.register(import("./routes/role/index.js"), {
		prefix: "/api/v1/roles",
	});

	fastify.register(import("./routes/playlist/index.js"), {
		prefix: "/api/v1/playlists",
	});

	fastify.register(import("./routes/userlist/index.js"), {
		prefix: "/api/v1/userlists",
	});

	fastify.register(import("fastify-raw-body"), {
		field: "rawBody",
		global: false,
		encoding: false,
		runFirst: true,
		routes: ["/api/v1/gems/webhook/*"],
	});

	fastify.register(import("./routes/gems/index.js"), {
		prefix: "/api/v1/gems",
	});

	fastify.register(import("./routes/subscriptions/index.js"), {
		prefix: "/api/v1/subscriptions",
	});

	fastify.register(import("./routes/payout/index.js"), {
		prefix: "/api/v1/payout",
	});

	fastify.register(import("./routes/stories/index.js"), {
		prefix: "/api/v1/stories",
	});

	fastify.register(import("./routes/stories/comment/index.js"), {
		prefix: "/api/v1/story/comments",
	});

	fastify.register(import("./routes/stories/report/index.js"), {
		prefix: "/api/v1/story/reports",
	});

	fastify.register(import("./routes/contact/index.js"), {
		prefix: "/api/v1/contact",
	});

	fastify.register(import("./routes/applications/index.js"), {
		prefix: "/api/v1/applications",
	});

	fastify.register(import("./routes/videocall/index.js"), {
		prefix: "/api/v1/videocall",
	});

	fastify.register(import("./routes/videocall/meetings/index.js"), {
		prefix: "/api/v1/videocall/meetings",
	});

	fastify.register(import("./routes/videocall/durations/index.js"), {
		prefix: "/api/v1/videocall/durations",
	});

	fastify.register(import("./routes/videocall/intervals/index.js"), {
		prefix: "/api/v1/videocall/intervals",
	});

	fastify.register(import("./routes/videocall/settings/index.js"), {
		prefix: "/api/v1/videocall/settings",
	});

	fastify.get("/api/health", (_req, reply) => {
		reply.send({ status: "ok" });
	});

	if (process.env.NODE_ENV !== "production") {
		fastify.register(import("./routes/cameo/durations/index.js"), {
			prefix: "/api/v1/cameo/durations",
		});

		fastify.register(import("./routes/cameo/settings/index.js"), {
			prefix: "/api/v1/cameo/settings",
		});
	}

	await fastify.listen({
		host,
		port,
		listenTextResolver: (addr) =>
			`Website API service listening at ${addr}`,
	});

	if (process.env.NODE_ENV !== "production") {
		await writeFile(
			"./openapi.json",
			JSON.stringify(fastify.swagger({}), null, 2),
		);

		logger.info("OpenAPI 3.0 schema written to ./openapi.json");
	}
}
