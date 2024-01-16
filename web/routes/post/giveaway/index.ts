import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import { GiveawayRespBody, GiveawayUpdateReqBody } from "./schemas.js";
import { GiveawayUpdateReqBodyValidator } from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);

	fastify.get<{ Params: IdParams }>(
		"/:id",
		{ schema: { params: IdParamsValidator } },
		async (request, reply) => {
			try {
				const { id } = request.params;
				const row = await prisma.giveaway.findFirst({
					where: { id: BigInt(id) },
					include: {
						roles: true,
						thumbMedia: true,
					},
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Giveaway"),
					);

				const result: GiveawayRespBody =
					ModelConverter.toIGiveaway(row);
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: GiveawayUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: GiveawayUpdateReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			try {
				const { id } = request.params;
				const data = request.body;
				const giveaway = await prisma.giveaway.findFirst({
					where: { id: BigInt(id), post: { profileId: profile.id } },
					include: {
						roles: true,
					},
				});
				if (!giveaway)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Giveaway"),
					);

				const roleIds = giveaway.roles.map((r) => r.roleId.toString());
				let rolesToAdd: string[] = [];
				let rolesToRemove: string[] = [];
				if (data.roles && data.roles?.length > 0) {
					rolesToAdd = data.roles.filter((r) => !roleIds.includes(r));
					rolesToRemove = roleIds.filter(
						(r) => !data.roles?.includes(r),
					);
				}

				await prisma.giveaway.update({
					where: { id: BigInt(id) },
					data: {
						prize: data.prize,
						thumb: data.thumb,
						endDate: data.endDate
							? new Date(data.endDate)
							: undefined,
						winnerCount: data.winnerCount,
						roles: {
							deleteMany:
								rolesToRemove.length > 0
									? rolesToRemove.map((r) => ({
											roleId: BigInt(r),
									  }))
									: undefined,
							createMany:
								rolesToAdd.length > 0
									? {
											data: rolesToAdd.map((r) => ({
												id: snowflake.gen(),
												roleId: BigInt(r),
											})),
									  }
									: undefined,
						},
					},
				});
				return reply.status(202);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: IdParams }>(
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
			try {
				const { id } = request.params;
				const giveaway = await prisma.giveaway.findFirst({
					where: { id: BigInt(id), post: { profileId: profile.id } },
				});
				if (!giveaway)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Giveaway"),
					);
				await prisma.giveaway.delete({
					where: { id: BigInt(id) },
				});
				return reply.status(202);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
