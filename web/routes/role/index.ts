import { Logger } from "pino";
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
import {
	RoleCreateReqBody,
	RoleRespBody,
	RoleUpdateReqBody,
	RolesRespBody,
} from "./schemas.js";
import {
	RoleCreateReqBodyValidator,
	RoleUpdateReqBodyValidator,
} from "./validation.js";
import { ModelConverter } from "../../models/modelConverter.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.get(
		"/",
		{
			schema: { querystring: PageQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const roles = await prisma.role.findMany({
				where: { profileId: profile.id },
				orderBy: { level: "desc" },
				include: {
					_count: {
						select: { userLevels: true },
					},
				},
			});
			const result: RolesRespBody = {
				roles: roles.map((row) => ({
					...ModelConverter.toIRole(row),
					fans: row._count.userLevels,
				})),
			};
			return reply.send(result);
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
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { id } = request.params;
			const role = await prisma.role.findFirst({
				where: { id: BigInt(id), profileId: profile.id },
			});
			if (!role) return reply.sendError(APIErrors.ITEM_NOT_FOUND("Role"));
			const result: RoleRespBody = ModelConverter.toIRole(role);
			return reply.status(200).send(result);
		},
	);

	fastify.post<{ Body: RoleCreateReqBody }>(
		"/",
		{
			schema: {
				body: RoleCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const data = request.body;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const roleCount = await prisma.role.count({
				where: { profileId: profile.id },
			});

			if (roleCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const role = await prisma.role.findFirst({
				where: { profileId: profile.id, name: data.name },
			});
			if (role) {
				return reply.sendError(
					APIErrors.INVALID_REQUEST(
						"You already have role with given name!",
					),
				);
			}
			const created = await prisma.role.create({
				data: {
					id: snowflake.gen(),
					name: data.name,
					color: data.color,
					icon: data.icon,
					customIcon: data.customIcon,
					level: data.level,
					profileId: profile.id,
				},
			});
			const result: RoleRespBody = ModelConverter.toIRole(created);
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: RoleUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: RoleUpdateReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.params;
			const data = request.body;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;

			const role = await prisma.role.findFirst({
				where: { id: BigInt(id) },
			});
			if (!role) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Role"));
			}
			if (role.profileId !== profile.id) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}
			await prisma.role.update({
				where: { id: BigInt(id) },
				data,
			});

			// if (data.level) {
			// 	await xpService.handleUpdateRole(profile.id);
			// }

			return reply.status(200).send();
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
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.params;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const role = await prisma.role.findFirst({
				where: { id: BigInt(id) },
			});
			if (!role) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Role"));
			}
			if (role.profileId !== profile.id) {
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			await prisma.role.delete({
				where: {
					id: BigInt(id),
				},
			});

			return reply.status(200).send();
		},
	);
}
