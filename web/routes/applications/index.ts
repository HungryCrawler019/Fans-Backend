import { randomBytes } from "node:crypto";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import APIErrors from "../../errors/index.js";
import { FastifyTypebox } from "../../types.js";
import {
	AppIdAndIdParam,
	AppIdParam,
	ApplicationCreateReqBody,
	CreateWebhookReqBody,
	GetApplicationRespBody,
	GetApplicationsRespBody,
	IconCreateReqBody,
} from "./schemas.js";
import {
	AppIdAndIdParamsValidator,
	AppIdParamsValidator,
	ApplicationCreateReqBodyValidator,
	ApplicationUpdateReqBodyValidator,
	CreateWebhookReqBodyValidator,
	IconCreateReqBodyValidator,
} from "./validation.js";
import { ModelConverter } from "../../models/modelConverter.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const session = await container.resolve(SessionManagerService);
	const snowflakes = await container.resolve(SnowflakeService);

	fastify.post<{ Body: ApplicationCreateReqBody }>(
		"/",
		{
			schema: {
				body: ApplicationCreateReqBodyValidator,
			},
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const userId = session.userId;
			const body = request.body;
			try {
				const existing = await prisma.application.findMany({
					where: {
						userId: BigInt(userId),
					},
				});
				if (existing && existing.length >= 5) {
					return reply.sendError(APIErrors.TOO_MANY_APPLICATIONS);
				}

				const token = createToken(32);
				const created = await prisma.application.create({
					data: {
						id: snowflakes.gen(),
						name: body.name,
						token,
						userId: BigInt(userId),
					},
				});

				if (created) {
					return reply.send({
						message: JSON.stringify({
							id: created.id.toString(),
							token,
						}),
					});
				} else {
					return reply.sendError(APIErrors.GENERIC_ERROR);
				}
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get<{}>(
		"/",
		{
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const userId = session.userId;
			try {
				const rows = await prisma.application.findMany({
					where: {
						userId: BigInt(userId),
					},
				});

				const result: GetApplicationsRespBody = {
					applications: rows.map((a) =>
						ModelConverter.toIApplication(a),
					),
				};
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get<{ Params: AppIdParam }>(
		"/:appId",
		{
			schema: {
				params: AppIdParamsValidator,
			},
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const session = request.session!;
			const userId = session.userId;
			const { appId } = request.params;
			try {
				const creator = await prisma.profile.findFirst({
					where: { userId: BigInt(userId) },
				});
				if (!creator) {
					return reply.sendError(APIErrors.APPS_NOT_A_CREATOR);
				}

				const row = await prisma.application.findFirst({
					where: {
						AND: {
							id: BigInt(appId),
							userId: BigInt(userId),
						},
					},
				});

				if (!row) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Application"),
					);
				}

				const result: GetApplicationRespBody =
					ModelConverter.toIApplication(row);

				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: ApplicationCreateReqBody; Params: AppIdParam }>(
		"/:appId",
		{
			schema: {
				params: AppIdParamsValidator,
				body: ApplicationUpdateReqBodyValidator,
			},
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const userId = session.userId;
			const { appId } = request.params;
			const { name } = request.body;
			try {
				const existing = await prisma.application.findFirst({
					where: {
						id: BigInt(appId),
						userId: BigInt(userId),
					},
				});

				if (!existing) {
					return reply.sendError(APIErrors.APPLICATION_NOT_FOUND);
				}

				await prisma.application.update({
					where: {
						id: BigInt(appId),
						userId: BigInt(userId),
					},
					data: {
						name: name,
					},
				});

				return reply.status(202).send();
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: AppIdParam }>(
		"/:appId",
		{
			schema: {
				params: AppIdParamsValidator,
			},
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const userId = session.userId;
			const { appId } = request.params;
			try {
				const result = await prisma.application.deleteMany({
					where: {
						AND: {
							id: BigInt(appId),
							userId: BigInt(userId),
						},
					},
				});

				if (result) {
					return reply.send();
				} else {
					return reply.sendError(
						APIErrors.APPLICATION_DELETION_FAILED,
					);
				}
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Body: CreateWebhookReqBody; Params: AppIdParam }>(
		"/:appId/webhook",
		{
			schema: {
				body: CreateWebhookReqBodyValidator,
				params: AppIdParamsValidator,
			},
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const creatorId = request.session!.userId;
			const { appId } = request.params;
			try {
				const creator = await prisma.profile.findFirst({
					where: { userId: BigInt(creatorId) },
				});
				if (!creator) {
					return reply.sendError(APIErrors.APPS_NOT_A_CREATOR);
				}

				const app = await prisma.application.findFirst({
					where: {
						AND: {
							id: BigInt(appId),
							userId: BigInt(creatorId),
						},
					},
				});

				if (!app) {
					return reply.sendError(APIErrors.APPLICATION_NOT_FOUND);
				}

				const existing = await prisma.webhookTarget.findMany({
					where: {
						appId: app.id,
					},
				});
				if (existing && existing.length >= 5) {
					return reply.sendError(APIErrors.TOO_MANY_WEBHOOKS);
				}

				const id = snowflakes.gen();
				const token = createToken(64);

				const result = await prisma.webhookTarget.create({
					data: {
						id,
						secret: token,
						target: request.body.target,
						appId: app.id,
					},
				});
				if (result) {
					return reply.send({
						message: JSON.stringify({
							id: id.toString(),
							secret: token,
						}),
					});
				} else {
					return reply.sendError(APIErrors.GENERIC_ERROR);
				}
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get<{ Params: AppIdParam }>(
		"/:appId/webhook",
		{
			schema: {
				params: AppIdParamsValidator,
			},
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const creatorId = request.session!.userId;
			const { appId } = request.params;
			try {
				const creator = await prisma.profile.findFirst({
					where: { userId: BigInt(creatorId) },
				});
				if (!creator) {
					return reply.sendError(APIErrors.APPS_NOT_A_CREATOR);
				}

				const app = await prisma.application.findFirst({
					where: {
						AND: {
							id: BigInt(appId),
							userId: BigInt(creatorId),
						},
					},
				});

				if (!app) {
					return reply.sendError(APIErrors.APPLICATION_NOT_FOUND);
				}

				const result = await prisma.webhookTarget.findMany({
					select: {
						id: true,
						secret: false,
						target: true,
						appId: true,
					},
					where: {
						appId: app.id,
					},
				});
				if (result) {
					return reply.send({
						message: JSON.stringify(result),
					});
				} else {
					return reply.sendError(APIErrors.GENERIC_ERROR);
				}
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: AppIdAndIdParam }>(
		"/:appId/webhook/:id",
		{
			schema: {
				params: AppIdAndIdParamsValidator,
			},
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const creatorId = request.session!.userId;
			const { appId, id } = request.params;
			try {
				const creator = await prisma.profile.findFirst({
					where: { userId: BigInt(creatorId) },
				});
				if (!creator) {
					return reply.sendError(APIErrors.APPS_NOT_A_CREATOR);
				}

				const app = await prisma.application.findFirst({
					where: {
						AND: {
							id: BigInt(appId),
							userId: BigInt(creatorId),
						},
					},
				});

				if (!app) {
					return reply.sendError(APIErrors.APPLICATION_NOT_FOUND);
				}

				const result = await prisma.webhookTarget.deleteMany({
					where: {
						id: BigInt(id),
						appId: app.id,
					},
				});
				if (result) {
					return reply.send({
						message: JSON.stringify({
							count: result.count,
						}),
					});
				} else {
					return reply.sendError(APIErrors.GENERIC_ERROR);
				}
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: IconCreateReqBody }>(
		"/icon",
		{
			schema: {
				body: IconCreateReqBodyValidator,
			},
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const creatorId = request.session!.userId;
			const { appId, icon } = request.body;
			try {
				const existing = await prisma.application.findFirst({
					where: {
						id: BigInt(appId),
						userId: BigInt(creatorId),
					},
				});

				if (!existing) {
					return reply.sendError(APIErrors.APPLICATION_NOT_FOUND);
				}

				await prisma.application.update({
					where: {
						id: BigInt(appId),
						userId: BigInt(creatorId),
					},
					data: {
						icon: icon,
					},
				});

				return reply.send({ message: "Application icon is updated." });
			} catch (error) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}

function createToken(length: number) {
	return randomBytes(length).toString("base64");
}
