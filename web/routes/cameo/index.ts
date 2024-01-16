import { Logger } from "pino";
import { FastifyTypebox } from "../../types.js";
import SessionManagerService, {
	Session,
} from "../../../common/service/SessionManagerService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { IdParams } from "../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../common/validators/validation.js";
import { CameoProfile } from "./schemas.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);

	fastify.get<{
		Reply: CameoProfile;
		Params: IdParams;
	}>(
		"/profiles/:id",
		{
			schema: {
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const settings = await prisma.customVideoSettings.findFirst({
				where: { profileId: BigInt(request.params.id) },
			});
			if (!settings) {
				return reply.sendError(APIErrors.CAMEO_SETTINGS_NOT_FOUND);
			}
			const durations = await prisma.customVideoDuration.findMany({
				where: {
					creatorId: BigInt(request.params.id),
					isEnabled: true,
				},
			});
			const customVideoDurations = durations
				.map(ModelConverter.toICameoDuration)
				.map(({ id, isEnabled, ...duration }) => duration);
			const isAvailable =
				settings.customVideoEnabled && !!durations.length;

			return reply.send({
				description: settings.description || "",
				sexualContentEnabled: settings.sexualContentEnabled,
				contentTypes: settings.contentTypes,
				customContentType: settings.customContentType || "",
				customVideoDurations,
				isAvailable,
			});
		},
	);
}
