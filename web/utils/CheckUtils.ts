import { SubscriptionStatus } from "@prisma/client";
import PrismaService from "../../common/service/PrismaService.js";

/**
 * Checks if the requesting user has access to the requested user's profile (eg. if they are subscribed to the profile)
 * @param prisma instance of PrismaService
 * @param requestingUserId ID of the user requesting access
 * @param userId ID of the user whose profile is being accessed
 * @param profileId ID of the profile being accessed
 * @returns true if the requesting user has access to the requested user's profile, false otherwise
 */
export const checkAccess = async (
	prisma: PrismaService,
	requestingUserId: bigint,
	userId: bigint,
	profileId: bigint,
): Promise<boolean> => {
	const activeSubscription =
		requestingUserId === userId ||
		(await prisma.paymentSubscription.findFirst({
			where: {
				creatorId: profileId,
				userId: requestingUserId,
				OR: [
					{
						status: SubscriptionStatus.Active,
					},
					{
						endDate: {
							gte: new Date(),
						},
					},
				],
			},
		}));

	return !!activeSubscription;
};
