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
	CategoriesRespBody,
	CategoryCreateReqBody,
	CategoryRespBody,
	CategoryUpdateReqBody,
} from "./schemas.js";
import {
	CategoryCreateReqBodyValidator,
	CategoryUpdateReqBodyValidator,
} from "./validation.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import CloudflareStreamService from "../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../common/service/MediaUploadService.js";
import { resolveURLsPostLike } from "../../utils/UploadUtils.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);
	const mediaUpload = await container.resolve(MediaUploadService);
	const maxObjectLimit = parseInt(process.env.MAX_OBJECT_LIMIT ?? "100");

	fastify.get<{ Querystring: PageQuery }>(
		"/",
		{
			schema: {
				querystring: PageQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			try {
				const query = request.query;
				const { page = 1, size = DEFAULT_PAGE_SIZE } = query;
				const session = request.session!;
				const profile = (await session.getProfile(prisma))!;
				const total = await prisma.category.count({
					where: { profileId: profile.id },
				});

				if (isOutOfRange(page, size, total)) {
					return reply.sendError(APIErrors.OUT_OF_RANGE);
				}

				const categories = await prisma.category.findMany({
					where: { profileId: profile.id },
					include: {
						_count: {
							select: { posts: true },
						},
						roles: {
							include: { role: true },
						},
					},
					take: size,
					skip: (page - 1) * size,
				});

				const result: CategoriesRespBody = {
					categories: categories.map((c) => ({
						...ModelConverter.toICategory(c),
						roles: c.roles.map((r) =>
							ModelConverter.toIRole(r.role),
						),
					})),
					page,
					size,
					total,
				};
				return reply.send(result);
			} catch (err) {
				request.log.error(err, "Error on get all categories");
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

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
				const row = await prisma.category.findFirst({
					where: { id: BigInt(id) },
					include: {
						_count: {
							select: { posts: true },
						},
						roles: {
							include: { role: true },
						},
						posts: {
							include: {
								post: {
									include: {
										thumbMedia: true,
										postMedias: {
											include: {
												upload: true,
											},
										},
									},
								},
							},
						},
					},
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("Category"),
					);

				await Promise.all(
					row.posts.map((p) =>
						resolveURLsPostLike(
							p.post,
							cloudflareStream,
							mediaUpload,
						),
					),
				);

				const result: CategoryRespBody = {
					...ModelConverter.toICategory(row),
					roles: row.roles.map((r) => ModelConverter.toIRole(r.role)),
					posts: row.posts.map((p) => ModelConverter.toIPost(p.post)),
				};
				return reply.status(200).send(result);
			} catch (err) {
				request.log.error(err, `Error on get categories/${id}`);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Body: CategoryCreateReqBody }>(
		"/",
		{
			schema: {
				body: CategoryCreateReqBodyValidator,
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
				const { name, isActive, postIds, roleIds } = request.body;
				const categoryCount = await prisma.category.count({
					where: { profileId: profile.id },
				});

				if (categoryCount >= maxObjectLimit) {
					return reply.sendError(APIErrors.REACHED_MAX_OBJECT_LIMIT);
				}

				const row = await prisma.category.findFirst({
					where: {
						name,
						profileId: profile.id,
					},
				});
				if (row)
					return reply.sendError(
						APIErrors.INVALID_REQUEST("Category is already exist!"),
					);
				const created = await prisma.category.create({
					data: {
						id: snowflake.gen(),
						name,
						profileId: profile.id,
						isActive: isActive ? isActive : true,
						posts:
							postIds && postIds.length > 0
								? {
										createMany: {
											data: postIds.map((p) => ({
												id: snowflake.gen(),
												postId: BigInt(p),
											})),
										},
								  }
								: undefined,
						roles:
							roleIds && roleIds.length > 0
								? {
										createMany: {
											data: roleIds.map((r) => ({
												id: snowflake.gen(),
												roleId: BigInt(r),
											})),
										},
								  }
								: undefined,
					},
					include: {
						roles: { include: { role: true } },
					},
				});

				const result: CategoryRespBody = {
					...ModelConverter.toICategory(created),
					roles: created.roles.map((r) =>
						ModelConverter.toIRole(r.role),
					),
				};
				return reply.status(201).send(result);
			} catch (err) {
				request.log.error(err, "Error on create categories");
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: CategoryUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				params: IdParamsValidator,
				body: CategoryUpdateReqBodyValidator,
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
			const { name, isActive, roleIds, postIds } = request.body;
			const category = await prisma.category.findUnique({
				where: { id: BigInt(id), profileId: profile.id },
				include: { roles: true, posts: true },
			});

			if (!category) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Category"));
			}

			const oldRoleIds = category.roles.map((r) => r.roleId.toString());
			let roleIdsToAdd: string[] = [];
			let roleIdsToRemove: string[] = [];

			if (roleIds && roleIds.length > 0) {
				roleIdsToAdd = roleIds.filter((p) => !oldRoleIds.includes(p));
				roleIdsToRemove = roleIds.filter(
					(p) => !oldRoleIds.includes(p),
				);
			}

			const oldPostIds = category.posts.map((r) => r.postId.toString());
			let postIdsToAdd: string[] = [];
			let postIdsToRemove: string[] = [];

			if (postIds && postIds.length > 0) {
				postIdsToAdd = postIds.filter((p) => !oldPostIds.includes(p));
				postIdsToRemove = postIds.filter(
					(p) => !oldPostIds.includes(p),
				);
			}

			try {
				await prisma.category.update({
					where: { id: BigInt(id) },
					data: {
						name,
						isActive,
						roles: {
							deleteMany:
								roleIdsToRemove.length > 0
									? roleIdsToRemove.map((p) => ({
											roleId: BigInt(p),
									  }))
									: undefined,
							createMany:
								roleIdsToAdd.length > 0
									? {
											data: roleIdsToAdd.map((p) => ({
												id: snowflake.gen(),
												roleId: BigInt(p),
											})),
									  }
									: undefined,
						},
						posts: {
							deleteMany:
								postIdsToRemove.length > 0
									? postIdsToRemove.map((p) => ({
											postId: BigInt(p),
									  }))
									: undefined,
							createMany:
								postIdsToAdd.length > 0
									? {
											data: postIdsToAdd.map((p) => ({
												id: snowflake.gen(),
												postId: BigInt(p),
											})),
									  }
									: undefined,
						},
					},
				});
				return reply
					.status(202)
					.send({ message: "Category is updated!" });
			} catch (err) {
				request.log.error(err, `Error on update categories/${id}`);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
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

			const category = await prisma.category.findUnique({
				where: { id: BigInt(id), profileId: profile.id },
			});

			if (!category) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Category"));
			}

			await prisma.category.delete({
				where: { id: BigInt(id) },
			});
			return reply.status(202).send({ message: "Category is deleted!" });
		},
	);
}
