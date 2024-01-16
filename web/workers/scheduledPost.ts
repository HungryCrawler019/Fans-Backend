import { Profile } from "@prisma/client";
import { Container } from "async-injection";
import BullMQService from "../../common/service/BullMQService.js";
import PrismaService from "../../common/service/PrismaService.js";

export default async function scheduledPost(container: Container) {
	const bullMQService = await container.resolve(BullMQService);
	const prisma = await container.resolve(PrismaService);

	const scheduledPostWorker = bullMQService.createWorker<
		{ id: string; profile: Profile },
		undefined,
		string
	>("scheduledPost", async (job) => {
		const { id, profile } = job.data;

		const post = await prisma.post.findFirst({
			where: { id: BigInt(id), profileId: profile.id },
			include: {
				roles: true,
				categories: true,
			},
		});
		if (!post || post.isPosted) return;

		await prisma.post.update({
			where: { id: BigInt(id) },
			data: {
				isPosted: true,
			},
		});
	});
}
