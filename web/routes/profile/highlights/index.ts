import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import { IdParams, PageQuery } from "../../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
} from "../../../../common/validators/validation.js";
import { FastifyTypebox } from "../../../types.js";
import {
	HighlightCreateReqBody,
	HighlightRespBody,
	HighlightUpdateReqBody,
	HighlightsRespBody,
} from "./schemas.js";
import {
	HighlightCreateReqBodyValidator,
	HighlightUpdateReqBodyValidator,
} from "./validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import {
	DEFAULT_PAGE_SIZE,
	isOutOfRange,
} from "../../../../common/pagination.js";

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
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			const profile = (await session.getProfile(prisma))!;

			const total = await prisma.highlight.count({
				where: { profileId: profile.id },
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const [highlights, storyComments, storyLikes] = await Promise.all([
				prisma.highlight.findMany({
					where: {
						profileId: profile.id,
					},
					include: {
						stories: {
							include: {
								story: {
									include: {
										storyMedias: {
											include: {
												upload: true,
											},
										},
										_count: {
											select: {
												storyComments: true,
												storyLikes: true,
											},
										},
									},
								},
							},
						},
					},
					skip: (page - 1) * size,
					take: size,
				}),
				prisma.storyComment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
				prisma.storyLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
			]);

			const result: HighlightsRespBody = {
				highlights: highlights.map((h) => ({
					...ModelConverter.toIHighlight(h),
					stories: h.stories.map((s) =>
						ModelConverter.toIStory(s.story, {
							isCommented: storyComments
								.map((sc) => sc.storyId)
								.includes(s.storyId),
							isLiked: storyLikes
								.map((sm) => sm.storyId)
								.includes(s.storyId),
						}),
					),
				})),
				page,
				size,
				total,
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
			const { id } = request.params;

			const row = await prisma.highlight.findFirst({
				where: { id: BigInt(id) },
				include: {
					stories: {
						include: {
							story: {
								include: {
									storyMedias: {
										include: {
											upload: true,
										},
									},
									_count: {
										select: {
											storyComments: true,
											storyLikes: true,
										},
									},
								},
							},
						},
					},
				},
			});
			if (!row) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Highlight"));
			}

			const [storyComments, storyLikes] = await Promise.all([
				prisma.storyComment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
				prisma.storyLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
			]);

			const result: HighlightRespBody = {
				...ModelConverter.toIHighlight(row),
				stories: row.stories.map((s) =>
					ModelConverter.toIStory(s.story, {
						isCommented: storyComments
							.map((sc) => sc.storyId)
							.includes(s.storyId),
						isLiked: storyLikes
							.map((sm) => sm.storyId)
							.includes(s.storyId),
					}),
				),
			};
			return reply.status(200).send(result);
		},
	);

	fastify.post<{ Body: HighlightCreateReqBody }>(
		"/",
		{
			schema: {
				body: HighlightCreateReqBodyValidator,
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

			const highlightCount = await prisma.highlight.count({
				where: {
					profileId: profile.id,
				},
			});

			if (highlightCount >= maxObjectLimit) {
				return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
			}

			const { title, cover, stories } = request.body;
			const created = await prisma.highlight.create({
				data: {
					id: snowflake.gen(),
					profileId: profile.id,
					title,
					cover,
					stories: {
						createMany: {
							data: stories.map((s) => ({
								storyId: BigInt(s),
							})),
						},
					},
				},
				include: {
					stories: {
						include: {
							story: {
								include: {
									storyMedias: {
										include: {
											upload: true,
										},
									},
									_count: {
										select: {
											storyComments: true,
											storyLikes: true,
										},
									},
								},
							},
						},
					},
				},
			});

			const [storyComments, storyLikes] = await Promise.all([
				prisma.storyComment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
				prisma.storyLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { storyId: true },
				}),
			]);

			const result: HighlightRespBody = {
				...ModelConverter.toIHighlight(created),
				stories: created.stories.map((s) =>
					ModelConverter.toIStory(s.story, {
						isCommented: storyComments
							.map((sc) => sc.storyId)
							.includes(s.storyId),
						isLiked: storyLikes
							.map((sm) => sm.storyId)
							.includes(s.storyId),
					}),
				),
			};
			return reply.status(201).send(result);
		},
	);

	fastify.put<{ Body: HighlightUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: HighlightUpdateReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { id } = request.params;
			const { title, cover, stories } = request.body;
			const profile = (await session.getProfile(prisma))!;

			const highlight = await prisma.highlight.findFirst({
				where: { id: BigInt(id), profileId: profile.id },
				include: {
					stories: true,
				},
			});

			if (!highlight) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Highlight"));
			}

			const storyIds = highlight?.stories.map((s) =>
				s.storyId.toString(),
			);

			let storiesToAdd: string[] = [];
			let storiesToRemove: string[] = [];

			if (stories && stories.length > 0) {
				storiesToAdd = stories.filter((r) => !storyIds.includes(r));
				storiesToRemove = storyIds.filter((r) => !stories?.includes(r));
			}

			await prisma.highlight.update({
				where: { id: BigInt(id) },
				data: {
					title,
					cover,
					stories: {
						deleteMany:
							storiesToRemove.length > 0
								? storiesToRemove.map((s) => ({
										storyId: BigInt(s),
								  }))
								: undefined,
						createMany:
							storiesToAdd.length > 0
								? {
										data: storiesToAdd.map((s) => ({
											storyId: BigInt(s),
										})),
								  }
								: undefined,
					},
				},
			});
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
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;

			const { id } = request.params;
			const deleted = await prisma.highlight
				.delete({
					where: { id: BigInt(id), profileId: profile.id },
				})
				.catch(() => null);

			if (!deleted) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Highlight"));
			}

			return reply.status(200).send();
		},
	);
}
