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
	CreatePostReportReqBody,
	CreatePostReportRespBody,
	ProcessPostReportReqBody,
	PostReportRespBody,
	PostReportsRespBody,
} from "./schemas.js";
import {
	CreatePostReportReqBodyValidator,
	ProcessPostReportReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	// Get all post reports
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
				const total = await prisma.postReport.count();
				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}

				const postReports = await prisma.postReport.findMany({
					take: size,
					skip: (page - 1) * size,
				});

				const result: PostReportsRespBody = {
					reports: postReports.map((pr) => ({
						...ModelConverter.toIPostReport(pr),
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

	// Get a post report by ID
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
				const postReport = await prisma.postReport.findFirst({
					where: { id: BigInt(id) },
				});
				if (!postReport)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("PostReport"),
					);

				const result: PostReportRespBody = {
					...ModelConverter.toIPostReport(postReport),
				};
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Update status of a post report
	fastify.put<{ Body: ProcessPostReportReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: ProcessPostReportReqBodyValidator,
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
				const postReport = await prisma.postReport.findFirst({
					where: { id: BigInt(id) },
				});
				if (!postReport) {
					return reply.sendError(APIErrors.ITEM_NOT_FOUND("Report"));
				}
				if (status === "ACCEPTED") {
					// Todo: perform to remove post / ban user etc
				}
				await prisma.postReport.update({
					where: { id: BigInt(id) },
					data: { status },
				});
				return reply
					.status(202)
					.send({ message: "Post Report is updated!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Create new post report
	fastify.post<{ Body: CreatePostReportReqBody }>(
		"/",
		{
			schema: {
				body: CreatePostReportReqBodyValidator,
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
				const post = await prisma.post.findFirst({
					where: { id: BigInt(data.postId) },
				});

				if (!post) {
					return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
				}

				const postReportCount = await prisma.postReport.count({
					where: { userId: BigInt(session.userId) },
				});

				if (postReportCount >= maxObjectLimit) {
					return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
				}

				const created = await prisma.postReport.create({
					data: {
						id: snowflake.gen(),
						postId: BigInt(data.postId),
						flag: data.reportFlag,
						reason: data.reason,
						userId: BigInt(session.userId),
					},
					include: {
						post: {
							include: {
								profile: {
									include: { user: true },
								},
							},
						},
					},
				});
				const result: CreatePostReportRespBody = {
					...ModelConverter.toIProfile(created.post.profile),
					user: ModelConverter.toIUser(
						created.post.profile.user!,
						false,
					),
				};
				return reply.status(200).send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
