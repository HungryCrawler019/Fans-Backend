import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../../common/pagination.js";
import PrismaService from "../../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../../common/service/SnowflakeService.js";
import {
	IdParams,
	PageQuery,
} from "../../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../../common/validators/validation.js";
import APIErrors from "../../../../errors/index.js";
import { ModelConverter } from "../../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../../types.js";
import {
	CommentReportCreateReqBody,
	CommentReportProcessReqBody,
	CommentReportRespBody,
	CommentReportsRespBody,
} from "./schemas.js";
import {
	CommentReportCreateReqBodyValidator,
	CommentReportProcessReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	// Get all comment reports
	fastify.get<{ Querystring: PageQuery }>(
		"/",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
				const total = await prisma.commentReport.count();
				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}
				const commentReports = await prisma.commentReport.findMany({
					include: { comment: true },
					take: size,
					skip: (page - 1) * size,
				});
				const result: CommentReportsRespBody = {
					reports: commentReports.map((r) => ({
						...ModelConverter.toICommentReport(r),
						comment: ModelConverter.toIComment(r.comment),
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

	// Get a comment report by ID
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
				const { id } = request.params;
				const commentReport = await prisma.commentReport.findFirst({
					where: { id: BigInt(id), userId: BigInt(session.userId) },
					include: { comment: true },
				});
				if (!commentReport)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("CommentReport"),
					);

				const result: CommentReportRespBody = {
					...ModelConverter.toICommentReport(commentReport),
					comment: ModelConverter.toIComment(commentReport.comment),
				};
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Update the status of a comment report
	fastify.put<{ Body: CommentReportProcessReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: CommentReportProcessReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const { id } = request.params;
				const { status } = request.body;
				const commentReport = await prisma.commentReport.findFirst({
					where: { id: BigInt(id), userId: BigInt(session.userId) },
				});
				if (!commentReport) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("CommentReport"),
					);
				}
				if (status === "ACCEPTED") {
					// Todo: perform to remove post / ban user etc
				}
				await prisma.commentReport.update({
					where: { id: BigInt(id), userId: BigInt(session.userId) },
					data: { status },
				});
				return reply.status(202);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Create a comment report
	fastify.post<{ Body: CommentReportCreateReqBody }>(
		"/",
		{
			schema: {
				body: CommentReportCreateReqBodyValidator,
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

				const commentReportCount = await prisma.commentReport.count({
					where: {
						userId: BigInt(session.userId),
					},
				});

				if (commentReportCount >= maxObjectLimit) {
					return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
				}

				await prisma.commentReport.create({
					data: {
						id: snowflake.gen(),
						commentId: BigInt(data.commentId),
						userId: BigInt(session.userId),
						reason: data.reason,
					},
				});
				return reply
					.status(201)
					.send({ message: "Comment Report is created!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
