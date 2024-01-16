import { Logger } from "pino";
import { FastifyTypebox } from "../../../types.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import { UpdateVideoCallSettingsValidator } from "./validation.js";
import { UpdateVideoCallSettings, VideoCallSettings } from "./schema.js";
import { Profile } from "@prisma/client";
import APIErrors from "../../../errors/index.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);

	fastify.patch<{
		Body: UpdateVideoCallSettings;
		Reply: UpdateVideoCallSettings;
	}>(
		"/",
		{
			schema: {
				body: UpdateVideoCallSettingsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const profile = (await session.getProfile(prisma)) as Profile;

			const {
				bufferBetweenCalls,
				meetingType,
				sexualContentAllowed,
				contentPreferences,
				customContentPreferences,
				meetingTitle,
				meetingDescription,
				notificationNewRequests,
				notificationCancellations,
				notificationReminders,
				notificationsByEmail,
				notificationsByPhone,
				videoCallsEnabled,
			} = request.body;

			const updatedProfile = await prisma.meetingSettings.update({
				where: { profileId: profile.id },
				data: {
					...(meetingType ? { meetingType } : {}),
					...(bufferBetweenCalls ? { bufferBetweenCalls } : {}),
					...(sexualContentAllowed !== undefined
						? { sexualContentAllowed }
						: {}),
					...(contentPreferences !== undefined
						? { contentPreferences }
						: {}),
					...(customContentPreferences !== undefined
						? { customContentPreferences }
						: {}),
					...(meetingTitle !== undefined
						? { title: meetingTitle }
						: {}),
					...(meetingDescription !== undefined
						? { description: meetingDescription }
						: {}),
					...(notificationNewRequests !== undefined
						? { notificationNewRequests }
						: {}),
					...(notificationCancellations !== undefined
						? { notificationCancellations }
						: {}),
					...(notificationReminders !== undefined
						? { notificationReminders }
						: {}),
					...(notificationsByEmail !== undefined
						? { notificationsByEmail }
						: {}),
					...(notificationsByPhone !== undefined
						? { notificationsByPhone }
						: {}),
					...(videoCallsEnabled !== undefined
						? { videoCallsEnabled }
						: {}),
				},
			});

			return reply.send(request.body);
		},
	);

	fastify.get<{ Reply: VideoCallSettings }>(
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
			const settings = await prisma.meetingSettings.findFirst({
				where: { profileId: creator.id },
			});
			if (!settings) {
				return reply.sendError(APIErrors.MEETING_SETTINGS_NOT_FOUND);
			}

			return reply.send({
				bufferBetweenCalls: settings.bufferBetweenCalls,
				meetingType: settings.meetingType,
				sexualContentAllowed: settings.sexualContentAllowed,
				contentPreferences: settings.contentPreferences,
				customContentPreferences:
					settings.customContentPreferences || "",
				meetingTitle: settings.title || "",
				meetingDescription: settings.description || "",
				notificationNewRequests: settings.notificationNewRequests,
				notificationCancellations: settings.notificationCancellations,
				notificationReminders: settings.notificationReminders,
				notificationsByEmail: settings.notificationsByEmail,
				notificationsByPhone: settings.notificationsByPhone,
				videoCallsEnabled: settings.videoCallsEnabled,
			});
		},
	);
}
