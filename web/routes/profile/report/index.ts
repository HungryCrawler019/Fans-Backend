import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../../common/validators/validation.js";
import APIErrors from "../../../errors/index.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	ProfileReportCreateReqBody,
	ProfileReportProcessReqBody,
	ProfileReportRespBody,
	ProfileReportsRespBody,
} from "./schemas.js";
import {
	ProfileReportCreateReqBodyValidator,
	ProfileReportProcessReqBodyValidator,
} from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	// Get all profile reports
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
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			const session = request.session!;
			try {
				const total = await prisma.profileReport.count({
					where: { userId: BigInt(session.userId) },
				});
				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}
				const profileReports = await prisma.profileReport.findMany({
					where: { userId: BigInt(session.userId) },
					include: { profile: true },
					skip: (page - 1) * size,
					take: size,
				});
				const result: ProfileReportsRespBody = {
					reports: profileReports.map((r) => ({
						...ModelConverter.toIProfileReport(r),
						profile: ModelConverter.toIProfile(r.profile),
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

	// Get a profile report by ID
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
				const { id } = request.params;
				const profileReport = await prisma.profileReport.findFirst({
					where: { id: BigInt(id) },
					include: { profile: true },
				});
				if (!profileReport)
					return reply.sendError(APIErrors.ITEM_NOT_FOUND("Report"));

				const result: ProfileReportRespBody = {
					...ModelConverter.toIProfileReport(profileReport),
					profile: ModelConverter.toIProfile(profileReport.profile),
				};
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Update the status of a profile report
	fastify.put<{ Body: ProfileReportProcessReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: ProfileReportProcessReqBodyValidator,
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
				const session = request.session!;

				const report = await prisma.profileReport.findFirst({
					where: { id: BigInt(id) },
				});
				if (!report) {
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("ProfileReport"),
					);
				}
				if (status === "ACCEPTED") {
					// Todo: perform to remove post / ban user etc
				}
				await prisma.profileReport.update({
					where: { id: BigInt(id) },
					data: { status },
				});
				return reply
					.status(202)
					.send({ message: "Profile Report is updated!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	// Create a profile report
	fastify.post<{ Body: ProfileReportCreateReqBody }>(
		"/",
		{
			schema: {
				body: ProfileReportCreateReqBodyValidator,
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

				const profileReportCount = await prisma.profileReport.count({
					where: {
						userId: BigInt(session.userId),
					},
				});

				if (profileReportCount >= maxObjectLimit) {
					return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
				}

				await prisma.profileReport.create({
					data: {
						id: snowflake.gen(),
						profileId: BigInt(data.profileId),
						userId: BigInt(session.userId),
						flag: data.reportFlag,
						reason: data.reason,
					},
				});
				return reply
					.status(204)
					.send({ message: "Profile Report is created!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);
}
