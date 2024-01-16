import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../../common/validators/validation.js";
import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	StoryReportCreateReqBody,
	StoryReportProcessReqBody,
	StoryReportRespBody,
	StoryReportsRespBody,
} from "./schemas.js";
import {
	StoryReportCreateReqBodyValidator,
	StoryReportProcessReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	// Get all story reports
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
			const session = request.session!;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			try {
				const total = await prisma.storyReport.count();
				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}

				const storyReports = await prisma.storyReport.findMany({
					take: size,
					skip: (page - 1) * size,
				});

				const result: StoryReportsRespBody = {
					reports: storyReports.map((sr) => ({
						...ModelConverter.toIStoryReport(sr),
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

	// Get a story report by ID
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
			const session = request.session!;
			const { id } = request.params;
			try {
				const storyReport = await prisma.storyReport.findFirst({
					where: { id: BigInt(id) },
				});
				if (!storyReport)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("StoryReport"),
					);

				const result: StoryReportRespBody = {
					...ModelConverter.toIStoryReport(storyReport),
				};
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Update status of a story report
	fastify.put<{ Body: StoryReportProcessReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: StoryReportProcessReqBodyValidator,
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
				const { status } = request.body;
				const storyReport = await prisma.storyReport.findFirst({
					where: { id: BigInt(id) },
				});
				if (!storyReport) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("StoryReport"),
					);
				}
				if (status === "ACCEPTED") {
					// Todo: perform to remove story / ban user etc
				}
				await prisma.storyReport.update({
					where: { id: BigInt(id) },
					data: { status },
				});
				return reply
					.status(202)
					.send({ message: "Story Report is updated!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Create new story report
	fastify.post<{ Body: StoryReportCreateReqBody }>(
		"/",
		{
			schema: {
				body: StoryReportCreateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const data = request.body;

				const storyReportCount = await prisma.storyReport.count({
					where: { userId: BigInt(session.userId) },
				});

				if (storyReportCount >= maxObjectLimit) {
					return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
				}

				await prisma.storyReport.create({
					data: {
						id: snowflake.gen(),
						storyId: BigInt(data.storyId),
						flag: data.reportFlag,
						reason: data.reason,
						userId: BigInt(session.userId),
					},
				});
				return reply
					.status(200)
					.send({ message: "Story Report is created!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
