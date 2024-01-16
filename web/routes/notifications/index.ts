import NotificationService from "../../../common/service/NotificationService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { IdParams } from "../../../common/validators/schemas.js";
import { FastifyTypebox } from "../../types.js";
import { IdParamsValidator } from "../../../common/validators/validation.js";
import {
	NotificationsListRespBody,
	NotificationSettingsReqBody,
} from "./schemas.js";
import { NotificationSettingsReqBodyValidator } from "./validation.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const notification = await container.resolve(NotificationService);
	const snowflake = await container.resolve(SnowflakeService);

	fastify.get<{
		Reply: NotificationsListRespBody;
	}>(
		"/list",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;

			const notifications = await notification.getNotifications(
				BigInt(session.userId),
			);

			return reply.send({ notifications });
		},
	);

	fastify.post<{
		Params: IdParams;
	}>(
		"/mark-read/:id",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
			schema: {
				params: IdParamsValidator,
			},
		},
		async (request, reply) => {
			const session = request.session!;

			notification.markAsRead(BigInt(session.userId), [
				BigInt(request.params.id),
			]);

			return reply.send();
		},
	);

	fastify.get(
		"/settings",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = await session.getProfile(prisma);

			const filter = profile
				? { profileId: profile.id }
				: { userId: user.id };

			const settings = await prisma.notificationsSettings.findFirst({
				where: filter,
				select: {
					newSubscriberCreatorEmail: true,
					tipCreatorEmail: true,
					paidPostCreatorEmail: true,
					messageCreatorEmail: true,
					chargebackCreatorEmail: true,
					messageFanEmail: true,
					transactionFanEmail: true,
					chargebackFanEmail: true,
					newPostFanEmail: true,
					newSubscriberCreatorInApp: true,
					cancelSubscriptionCreatorInApp: true,
					tipCreatorInApp: true,
					paidPostCreatorInApp: true,
					chargebackCreatorInApp: true,
					messageCreatorInApp: true,
					commentCreatorInApp: true,
					likeCreatorInApp: true,
					messageFanInApp: true,
					transactionFanInApp: true,
					chargebackFanInApp: true,
					replyCommentInApp: true,
					mentionedInApp: true,
				},
			});

			return reply.send(settings);
		},
	);

	fastify.post<{
		Body: NotificationSettingsReqBody;
	}>(
		"/settings",
		{
			schema: {
				body: NotificationSettingsReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = await session.getProfile(prisma);

			const settings = request.body;

			const filter = profile
				? { profileId: profile.id }
				: { userId: user.id };

			const existingSettings =
				await prisma.notificationsSettings.findFirst({
					where: filter,
				});

			if (existingSettings) {
				await prisma.notificationsSettings.update({
					where: { id: existingSettings.id },
					data: settings,
				});
			} else {
				await prisma.notificationsSettings.create({
					data: {
						id: snowflake.gen(),
						...filter,
						...settings,
					},
				});
			}

			return reply.status(204).send();
		},
	);
}
