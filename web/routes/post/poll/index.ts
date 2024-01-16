import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import {
	PollRespBody,
	PollUpdateReqBody,
	VetoPollReqBody,
	VotePollReqBody,
} from "./schemas.js";
import {
	PollUpdateReqBodyValidator,
	VetoPollReqBodyValidator,
	VotePollReqBodyValidator,
} from "./validation.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);

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
			const { id } = request.params;
			const row = await prisma.poll.findFirst({
				where: { id: BigInt(id) },
				include: {
					thumbMedia: true,
					roles: {
						include: { role: true },
					},
					pollAnswers: {
						include: {
							_count: {
								select: { pollVotes: true },
							},
						},
					},
				},
			});
			if (!row) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll"));
			}
			const result: PollRespBody = ModelConverter.toIPoll(row);
			return reply.send(result);
		},
	);

	fastify.put<{ Body: PollUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: PollUpdateReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { id } = request.params;
			const data = request.body;
			const row = await prisma.poll.findFirst({
				where: { id: BigInt(id) },
				include: {
					roles: true,
				},
			});
			if (!row) return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll"));
			// update poll with roles

			return reply.status(202).send();
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
				const { id } = request.params;
				const row = await prisma.poll.findFirst({
					where: { id: BigInt(id) },
				});
				if (!row)
					return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll"));
				await prisma.poll.delete({
					where: { id: BigInt(id) },
				});
				return reply.status(202).send({ message: "Poll is deleted!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Body: VotePollReqBody }>(
		"/vote",
		{
			schema: { body: VotePollReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { pollId, answerId } = request.body;
			const poll = await prisma.poll.findFirst({
				where: { id: BigInt(pollId) },
				include: { pollAnswers: { include: { pollVotes: true } } },
			});

			if (!poll) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll"));
			}

			const answer = poll.pollAnswers.find(
				(pa) => pa.id.toString() === answerId,
			);

			if (!answer) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll Answer"));
			}

			const pollVoteCount = await prisma.pollVote.count({
				where: {
					userId: BigInt(session.userId),
					pollAnswer: {
						pollId: BigInt(pollId),
					},
				},
			});

			if (pollVoteCount > 0) {
				return reply.sendError(APIErrors.POLL_IS_VOTED_ALREADY);
			}

			const pollVote = answer.pollVotes.find(
				(pv) => pv.userId.toString() === session.userId,
			);
			if (!pollVote) {
				return reply.sendError(APIErrors.POLL_ANSWER_IS_VOTED_ALREADY);
			}

			await prisma.pollVote.create({
				data: {
					id: snowflake.gen(),
					userId: BigInt(session.userId),
					pollAnswerId: BigInt(answerId),
				},
			});

			const updatedPoll = await prisma.poll.findFirst({
				where: { id: BigInt(pollId) },
				include: {
					thumbMedia: true,
					roles: {
						include: { role: true },
					},
					pollAnswers: {
						include: {
							_count: {
								select: { pollVotes: true },
							},
						},
					},
				},
			});
			if (!updatedPoll) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll"));
			}
			const result: PollRespBody = ModelConverter.toIPoll(updatedPoll);
			return reply.send(result);
		},
	);

	fastify.delete<{ Body: VetoPollReqBody }>(
		"/vote",
		{
			schema: { body: VetoPollReqBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const { pollId, answerId } = request.body;
			const poll = await prisma.poll.findFirst({
				where: { id: BigInt(pollId) },
				include: { pollAnswers: { include: { pollVotes: true } } },
			});

			if (!poll) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll"));
			}

			const answer = poll.pollAnswers.find(
				(pa) => pa.id.toString() === answerId,
			);

			if (!answer) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll Answer"));
			}

			const pollVoteCount = await prisma.pollVote.count({
				where: {
					userId: BigInt(session.userId),
					pollAnswer: { pollId: BigInt(pollId) },
				},
			});

			if (pollVoteCount === 0) {
				return reply.sendError(APIErrors.POLL_IS_NOT_VOTED_YET);
			}

			const pollVote = answer.pollVotes.find(
				(pv) => pv.userId.toString() === session.userId,
			);
			if (!pollVote) {
				return reply.sendError(APIErrors.POLL_ANSWER_IS_VOTED_ALREADY);
			}

			await prisma.pollVote.delete({
				where: { id: pollVote.id },
			});

			const updatedPoll = await prisma.poll.findFirst({
				where: { id: BigInt(pollId) },
				include: {
					thumbMedia: true,
					roles: {
						include: { role: true },
					},
					pollAnswers: {
						include: {
							_count: {
								select: { pollVotes: true },
							},
						},
					},
				},
			});
			if (!updatedPoll) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Poll"));
			}
			const result: PollRespBody = ModelConverter.toIPoll(updatedPoll);
			return reply.send(result);
		},
	);
}
