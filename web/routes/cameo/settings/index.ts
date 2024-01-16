import { Logger } from "pino";
import { FastifyTypebox } from "../../../types.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import { CameoSettings, UpdateCameoSettings } from "./schemas.js";
import { UpdateCameoPreferencesValidator } from "./validation.js";
import APIErrors from "../../../errors/index.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);

	fastify.patch<{
		Body: UpdateCameoSettings;
		Reply: UpdateCameoSettings;
	}>(
		"/",
		{
			schema: {
				body: UpdateCameoPreferencesValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;

			const {
				volumeLimit,
				fulfillmentTime,
				description,
				sexualContentEnabled,
				contentTypes,
				customContentType,
				agreedToTerms,
				notificationNewRequests,
				notificationPendingVideos,
				notificationCompletedRequests,
				notificationsByEmail,
				notificationsByPhone,
				customVideoEnabled,
			} = request.body;

			await prisma.customVideoSettings.update({
				where: { profileId: creator.id },
				data: {
					...(volumeLimit
						? {
								volumeTimeUnit: volumeLimit.unit,
								volumeLimit: volumeLimit.amount,
						  }
						: {}),
					...(fulfillmentTime ? { fulfillmentTime } : {}),
					...(description ? { description } : {}),
					...(sexualContentEnabled !== undefined
						? { sexualContentEnabled }
						: {}),
					...(contentTypes ? { contentTypes } : {}),
					...(customContentType ? { customContentType } : {}),
					...(agreedToTerms !== undefined ? { agreedToTerms } : {}),
					...(notificationNewRequests !== undefined
						? { notificationNewRequests }
						: {}),
					...(notificationPendingVideos !== undefined
						? { notificationPendingVideos }
						: {}),
					...(notificationCompletedRequests !== undefined
						? { notificationCompletedRequests }
						: {}),
					...(notificationsByEmail !== undefined
						? { notificationsByEmail }
						: {}),
					...(notificationsByPhone !== undefined
						? { notificationsByPhone }
						: {}),
					...(customVideoEnabled !== undefined
						? { customVideoEnabled }
						: {}),
				},
			});

			return reply.send(request.body);
		},
	);

	fastify.get<{ Reply: CameoSettings }>(
		"/",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const creator = (await session.getProfile(prisma))!;
			const settings = await prisma.customVideoSettings.findFirst({
				where: { profileId: creator.id },
			});
			if (!settings) {
				return reply.sendError(APIErrors.CAMEO_SETTINGS_NOT_FOUND);
			}

			return reply.send({
				volumeLimit: {
					amount: settings.volumeLimit,
					unit: settings.volumeTimeUnit,
				},
				fulfillmentTime: settings.fulfillmentTime,
				description: settings.description || "",
				sexualContentEnabled: settings.sexualContentEnabled,
				contentTypes: settings.contentTypes,
				customContentType: settings.customContentType || "",
				agreedToTerms: settings.agreedToTerms,
				notificationNewRequests: settings.notificationNewRequests,
				notificationPendingVideos: settings.notificationPendingVideos,
				notificationCompletedRequests:
					settings.notificationCompletedRequests,
				notificationsByEmail: settings.notificationsByEmail,
				notificationsByPhone: settings.notificationsByPhone,
				customVideoEnabled: settings.customVideoEnabled,
			});
		},
	);
}
