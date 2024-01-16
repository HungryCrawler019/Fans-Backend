import { Container } from "async-injection";
import { Logger } from "pino";
import BullMQService from "../../common/service/BullMQService.js";
import { MeetingService } from "../../common/service/MeetingService.js";

export default async function scheduledMeeting(container: Container) {
	const bullMQService = await container.resolve(BullMQService);
	const meetingService = await container.resolve(MeetingService);
	const logger = await container.resolve<Logger>("logger");

	const worker = bullMQService.createWorker<
		{ meetingId: bigint },
		undefined,
		string
	>("Meeting", async (job) => {
		const { meetingId } = job.data;

		try {
			if (job.name === "prepareRoom") {
				await meetingService.prepareRoom(meetingId);
			} else if (job.name === "cleanRoom") {
				await meetingService.cleanRoom(meetingId);
			}
		} catch (e) {
			logger.error(e, `Job ${job.id} failed with error`);
		}
	});
}
