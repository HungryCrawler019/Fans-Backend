import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import APIErrors from "../../../errors/index.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	UserReportCreateReqBody,
	UserReportProcessReqBody,
	UserReportRespBody,
	UserReportsRespBody,
} from "./schemas.js";
import {
	UserReportCreateReqBodyValidator,
	UserReportProcessReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	// Get all user reports
	fastify.get<{ Querystring: PageQuery }>(
		"/",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			try {
				const total = await prisma.userReport.count({
					where: { creatorId: profile.id },
				});
				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}
				const UserReports = await prisma.userReport.findMany({
					where: { creatorId: profile.id },
					include: { user: true },
					skip: (page - 1) * size,
					take: size,
				});
				const result: UserReportsRespBody = {
					reports: UserReports.map((r) => ({
						...ModelConverter.toIUserReport(r),
						user: ModelConverter.toIUser(r.user),
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

	// Get a user report by ID
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
			try {
				const session = request.session!;
				const profile = (await session.getProfile(prisma))!;
				const { id } = request.params;
				const userReport = await prisma.userReport.findFirst({
					where: { id: BigInt(id), creatorId: profile.id },
					include: { user: true },
				});
				if (!userReport)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("UserReport"),
					);

				const result: UserReportRespBody = {
					...ModelConverter.toIUserReport(userReport),
					user: ModelConverter.toIUser(userReport.user),
				};
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Update the status of a user report
	fastify.put<{ Body: UserReportProcessReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: UserReportProcessReqBodyValidator,
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
				const { status } = request.body;
				const userReport = await prisma.userReport.findFirst({
					where: { id: BigInt(id), creatorId: profile.id },
				});
				if (!userReport) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("UserReport"),
					);
				}
				if (status === "ACCEPTED") {
					// Todo: perform to remove post / ban user etc
				}
				await prisma.userReport.update({
					where: { id: BigInt(id) },
					data: { status },
				});
				return reply
					.status(202)
					.send({ message: "User Report is updated!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Create a user report
	fastify.post<{ Body: UserReportCreateReqBody }>(
		"/",
		{
			schema: {
				body: UserReportCreateReqBodyValidator,
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
				const data = request.body;

				const userReportCount = await prisma.userReport.count({
					where: { creatorId: profile.id },
				});

				if (userReportCount >= maxObjectLimit) {
					return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
				}

				await prisma.userReport.create({
					data: {
						id: snowflake.gen(),
						creatorId: profile.id,
						flag: data.flag,
						userId: BigInt(data.userId),
						reason: data.reason,
					},
				});
				return reply.status(201);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
