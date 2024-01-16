import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../common/validators/validation.js";
import APIErrors from "../../errors/index.js";
import { FastifyTypebox } from "../../types.js";
import {
	ExplicitCommentFilterReqBody,
	HideCommentsReqBody,
	HideLikesReqBody,
	HideTipsReqBody,
	LimitFuturePaymentParams,
	ReferralSetupReqBody,
	ShowProfileReqBody,
	WatermarkReqBody,
} from "./schemas.js";
import {
	ExplicitCommentFilterReqBodyValidator,
	HideCommentsReqBodyValidator,
	HideLikesReqBodyValidator,
	HideTipsReqBodyValidator,
	LimitFuturePaymentParamsValidator,
	ReferralSetupReqBodyValidator,
	ShowProfileReqBodyValidator,
	WatermarkReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);

	fastify.put<{ Body: ExplicitCommentFilterReqBody; Params: IdParams }>(
		"/:id/explicitCommentFilter",
		{
			schema: {
				body: ExplicitCommentFilterReqBodyValidator,
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
				const { explicitCommentFilter } = request.body;
				const { id } = request.params;

				if (profile.id !== BigInt(id)) {
					return reply.sendError(APIErrors.PERMISSION_ERROR);
				}

				await prisma.profile.update({
					where: { id: BigInt(id) },
					data: { explicitCommentFilter },
				});

				return reply.send({ message: "Success!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: HideCommentsReqBody; Params: IdParams }>(
		"/:id/hideComments",
		{
			schema: {
				body: HideCommentsReqBodyValidator,
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
				const { hideComments } = request.body;
				const { id } = request.params;

				if (profile.id !== BigInt(id)) {
					return reply.sendError(APIErrors.PERMISSION_ERROR);
				}

				await prisma.profile.update({
					where: { id: BigInt(id) },
					data: { hideComments },
				});

				return reply.send({ message: "Success!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: HideLikesReqBody; Params: IdParams }>(
		"/:id/hideLikes",
		{
			schema: {
				body: HideLikesReqBodyValidator,
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
				const { hideLikes } = request.body;
				const { id } = request.params;

				if (profile.id !== BigInt(id)) {
					return reply.sendError(APIErrors.PERMISSION_ERROR);
				}

				await prisma.profile.update({
					where: { id: BigInt(id) },
					data: { hideLikes },
				});

				return reply.send({ message: "Success!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: HideTipsReqBody; Params: IdParams }>(
		"/:id/hideTips",
		{
			schema: {
				body: HideTipsReqBodyValidator,
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
				const { hideTips } = request.body;
				const { id } = request.params;

				if (profile.id !== BigInt(id)) {
					return reply.sendError(APIErrors.PERMISSION_ERROR);
				}

				await prisma.profile.update({
					where: { id: BigInt(id) },
					data: { hideTips },
				});

				return reply.send({ message: "Success!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Body: ShowProfileReqBody }>(
		"/show-profile",
		{
			schema: { body: ShowProfileReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const { showProfile } = request.body;

				await prisma.profile.update({
					where: { userId: BigInt(session.userId) },
					data: { showProfile },
				});

				return reply.send({ message: "Success!" });
			} catch (error) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: WatermarkReqBody; Params: IdParams }>(
		"/:id/watermark",
		{
			schema: {
				body: WatermarkReqBodyValidator,
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
				const { watermark } = request.body;
				const { id } = request.params;

				if (profile.id !== BigInt(id)) {
					return reply.sendError(APIErrors.PERMISSION_ERROR);
				}

				await prisma.profile.update({
					where: { id: BigInt(id) },
					data: { watermark },
				});

				return reply.send({ message: "Success!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Params: LimitFuturePaymentParams }>(
		"/:creatorId/limitUser/:userId",
		{
			schema: {
				params: LimitFuturePaymentParamsValidator,
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
			const { creatorId, userId } = request.params;
			try {
				if (profile.id !== BigInt(creatorId)) {
					return reply.sendError(APIErrors.PERMISSION_ERROR);
				}

				const existedRow = await prisma.limitUser.findFirst({
					where: {
						creatorId: BigInt(creatorId),
						userId: BigInt(userId),
					},
				});

				if (existedRow) {
					return reply.sendError(APIErrors.DUPLICATED_LIMIT_USER);
				}
				const created = await prisma.limitUser.create({
					data: {
						creatorId: BigInt(creatorId),
						userId: BigInt(userId),
					},
				});
				return reply.send({ message: "Limit user is created!" });
			} catch (error) {
				console.log(error);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: ReferralSetupReqBody; Params: IdParams }>(
		"/:id/fan-referral",
		{
			schema: {
				body: ReferralSetupReqBodyValidator,
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
				const {
					isFanReferralEnabled,
					fanReferralShare,
					marketingContentLink,
				} = request.body;
				const { id } = request.params;

				if (profile.id !== BigInt(id)) {
					return reply.sendError(APIErrors.PERMISSION_ERROR);
				}

				await prisma.profile.update({
					where: { id: BigInt(id) },
					data: {
						isFanReferralEnabled,
						fanReferralShare,
						marketingContentLink,
					},
				});

				return reply.send();
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
