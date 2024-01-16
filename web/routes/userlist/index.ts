import APIErrors from "../../errors/index.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../common/validators/validation.js";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import {
	AddCreatorReqBody,
	UserlistCreateReqBody,
	UserlistRespBody,
	UserlistUpdateReqBody,
	UserlistsRespBody,
} from "./schemas.js";
import {
	AddCreatorReqBodyValidator,
	UserlistCreateReqBodyValidator,
	UserlistUpdateReqBodyValidator,
} from "./validation.js";
import { logger } from "@sentry/utils";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.get<{ Querystring: PageQuery }>(
		"/",
		{
			schema: { querystring: PageQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const user = await session.getUser(prisma);
				const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
				const total = await prisma.userList.count({
					where: {
						userId: BigInt(session.userId),
					},
				});
				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}
				const rows = await prisma.userList.findMany({
					where: {
						userId: BigInt(session.userId),
					},
					include: {
						creators: {
							include: { profile: true },
						},
					},
					skip: (page - 1) * size,
					take: size,
				});

				const result: UserlistsRespBody = {
					userlists: rows.map((r) => ({
						...ModelConverter.toIUserlist(r, {
							isActive: user.activeUserListId === r.id,
						}),
						creators: r.creators.map((u) =>
							ModelConverter.toIProfile(u.profile),
						),
					})),
					page,
					size,
					total,
				};
				return reply.send(result);
			} catch (err) {
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
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const user = await session.getUser(prisma);
				const { id: userlistId } = request.params;

				const userlist = await prisma.userList.findFirst({
					where: {
						id: BigInt(userlistId),
						userId: BigInt(session.userId),
					},
					include: {
						creators: {
							include: { profile: true },
						},
					},
				});
				if (!userlist) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("UserList"),
					);
				}

				const result: UserlistRespBody = {
					...ModelConverter.toIUserlist(userlist, {
						isActive: user.activeUserListId === userlist.id,
					}),
					creators: userlist.creators.map((u) =>
						ModelConverter.toIProfile(u.profile),
					),
				};
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Body: UserlistCreateReqBody }>(
		"/",
		{
			schema: {
				body: UserlistCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const data = request.body;
				const session = request.session!;
				const user = await session.getUser(prisma);

				const userlistCount = await prisma.userList.count({
					where: { userId: BigInt(session.userId) },
				});

				if (userlistCount >= maxObjectLimit) {
					return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
				}

				const created = await prisma.userList.create({
					include: {
						creators: {
							include: { profile: true },
						},
					},
					data: {
						id: snowflake.gen(),
						title: data.title,
						userId: BigInt(session.userId),
						creators:
							data.creators.length > 0
								? {
										createMany: {
											data: data.creators.map((p) => ({
												profileId: BigInt(p),
											})),
										},
								  }
								: undefined,
					},
				});
				const result: UserlistRespBody = {
					...ModelConverter.toIUserlist(created, {
						isActive: user.activeUserListId === created.id,
					}),
					creators: created.creators.map((u) =>
						ModelConverter.toIProfile(u.profile),
					),
				};
				return reply.status(201).send(result);
			} catch (err) {
				console.log("===> err ===> ", err);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: UserlistUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: UserlistUpdateReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				const data = request.body;
				const row = await prisma.userList.findFirst({
					where: { id: BigInt(id) },
					include: {
						creators: true,
					},
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Userlist"),
					);
				const userIds = row.creators.map((u) => u.profileId.toString());
				let usersToAdd: string[] = [];
				let usersToRemove: string[] = [];

				if (data.creators && data.creators.length > 0) {
					usersToAdd = data.creators.filter(
						(u) => !userIds.includes(u),
					);
					usersToRemove = userIds.filter(
						(u) => !data.creators?.includes(u),
					);
				}

				await prisma.userList.update({
					where: { id: BigInt(id) },
					data: {
						title: data.title ?? undefined,
						creators: {
							deleteMany:
								usersToRemove.length > 0
									? usersToRemove.map((p) => ({
											profileId: BigInt(p),
									  }))
									: undefined,
							createMany:
								usersToAdd.length > 0
									? {
											data: usersToAdd.map((p) => ({
												profileId: BigInt(p),
											})),
									  }
									: undefined,
						},
					},
				});

				return reply
					.status(202)
					.send({ message: "User list is updated!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				await prisma.userListUser.deleteMany({
					where: { userlistId: BigInt(id) },
				});
				await prisma.userList.delete({
					where: { id: BigInt(id) },
				});
				return reply
					.status(202)
					.send({ message: "User list is deleted!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Params: IdParams; Body: AddCreatorReqBody }>(
		"/addCreator/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: AddCreatorReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id: userListId } = request.params;
			const { creatorId } = request.body;
			const userList = await prisma.userList.findFirst({
				where: { id: BigInt(userListId) },
				include: {
					creators: true,
				},
			});
			if (!userList) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Userlist"));
			} else if (
				userList.creators
					.map((c) => c.profileId.toString())
					.includes(creatorId)
			) {
				return reply.sendError(APIErrors.CREATOR_IS_ADDED_ALREADY);
			}

			await prisma.userListUser.create({
				data: {
					userlistId: BigInt(userListId),
					profileId: BigInt(creatorId),
				},
			});

			return reply
				.status(202)
				.send({ message: "Creator is added to user list!" });
		},
	);
}
