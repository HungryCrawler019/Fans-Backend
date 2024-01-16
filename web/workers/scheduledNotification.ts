import NotificationService, {
	NotificationCreateOptions,
} from "../../common/service/NotificationService.js";
import BullMQService from "../../common/service/BullMQService.js";
import { Container } from "async-injection";

export default async function scheduledNotification(container: Container) {
	const bullMQService = await container.resolve(BullMQService);
	const notification = await container.resolve(NotificationService);

	const scheduledNotificationWorker = bullMQService.createWorker<
		{ userId: bigint; options: NotificationCreateOptions },
		undefined,
		string
	>("scheduledNotification", async (job) => {
		const { userId, options } = job.data;

		await notification.createNotification(userId, options);
	});
}
