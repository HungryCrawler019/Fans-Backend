import APIErrors from "../../errors/index.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../common/validators/validation.js";
import { FastifyTypebox } from "../../types.js";
import { UserRespBody, UserSearchPageQuery, UsersRespBody } from "./schemas.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import { logger } from "@sentry/utils";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);

	fastify.get<{ Querystring: UserSearchPageQuery }>(
		"/",
		{
			schema: {
				querystring: PageQueryValidator,
			},
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			try {
				const {
					query = "",
					page = 1,
					size = DEFAULT_PAGE_SIZE,
					type,
				} = request.query;
				const total = await prisma.user.count({
					where: {
						OR: [
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								username: {
									contains: query,
									mode: "insensitive",
								},
							},
						],
						type,
					},
				});

				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}

				const users = await prisma.user.findMany({
					where: {
						OR: [
							{
								displayName: {
									contains: query,
									mode: "insensitive",
								},
							},
							{
								username: {
									contains: query,
									mode: "insensitive",
								},
							},
						],
						type,
					},
					include: {
						profile: true,
					},
					take: size,
					skip: (page - 1) * size,
				});
				const result: UsersRespBody = {
					users: users.map((u) => ({
						...ModelConverter.toIUser(u),
						profile: u.profile
							? ModelConverter.toIProfile(u.profile)
							: undefined,
					})),
					page,
					size,
					total,
				};
				return reply.send(result);
			} catch (err) {
				request.log.error(err, "Error on get all categories");
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get<{ Params: IdParams }>(
		"/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.params;
			try {
				const row = await prisma.user.findFirst({
					where: { id: BigInt(id) },
				});
				if (!row)
					return reply.sendError(APIErrors.ITEM_NOT_FOUND("User"));
				const result: UserRespBody = ModelConverter.toIUser(row);
				return reply.status(200).send(result);
			} catch (err) {
				request.log.error(err, `Error on get users/${id}`);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Params: IdParams }>(
		"/active-userlist/:id",
		{
			schema: { params: IdParamsValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: userlistId } = request.params;
			try {
				const userlist = await prisma.userList.count({
					where: {
						userId: BigInt(session.userId),
						id: BigInt(userlistId),
					},
				});

				if (userlist < 1) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("UserList"),
					);
				}

				await prisma.user.update({
					where: {
						id: BigInt(session.userId),
					},
					data: {
						activeUserListId: BigInt(userlistId),
					},
				});
				return reply.status(200).send();
			} catch (error) {
				logger.error(error);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete(
		"/active-userlist",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			try {
				await prisma.user.update({
					where: {
						id: BigInt(session.userId),
					},
					data: {
						activeUserListId: null,
					},
				});
				return reply.status(200).send();
			} catch (error) {
				logger.error(error);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
