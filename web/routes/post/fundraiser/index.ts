import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import { FundraiserRespBody, FundraiserUpdateReqBody } from "./schemas.js";
import { FundraiserUpdateReqBodyValidator } from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);

	fastify.get<{ Params: IdParams }>(
		"/:id",
		{ schema: { params: IdParamsValidator } },
		async (request, reply) => {
			const { id } = request.params;
			try {
				const row = await prisma.fundraiser.findFirst({
					where: { id: BigInt(id) },
					include: { thumbMedia: true },
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Fundraiser"),
					);
				const result: FundraiserRespBody =
					ModelConverter.toIFundraiser(row);
				return reply.send(result);
			} catch (err) {
				request.log.error(err, `Error on get fundraiser/${id}`);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: FundraiserUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: FundraiserUpdateReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const profile = (await session.getProfile(prisma))!;
				const { id } = request.params;
				const data = request.body;
				const fundraiser = await prisma.fundraiser.findFirst({
					where: { id: BigInt(id), post: { profileId: profile.id } },
				});
				if (!fundraiser)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Fundraiser"),
					);
				await prisma.fundraiser.update({
					where: { id: BigInt(id) },
					data,
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
			try {
				const session = request.session!;
				const profile = (await session.getProfile(prisma))!;
				const { id } = request.params;
				const fundraiser = await prisma.fundraiser.findFirst({
					where: { id: BigInt(id), post: { profileId: profile.id } },
				});
				if (!fundraiser)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Fundraiser"),
					);
				await prisma.fundraiser.delete({
					where: { id: BigInt(id) },
				});
				return reply.status(202);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
