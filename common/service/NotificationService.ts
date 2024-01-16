import { Comment, Post, Profile, Role, User } from "@prisma/client";
import { Injectable, Injector } from "async-injection";
import { Logger } from "pino";
import { INotification, NotificationType } from "../../web/CommonAPISchemas.js";
import { ModelConverter } from "../../web/models/modelConverter.js";
import { userBasicSelector } from "../../web/models/modelSelectors.js";
import { PrismaJson } from "../Types.js";
import CloudflareStreamService from "./CloudflareStreamService.js";
import MediaUploadService from "./MediaUploadService.js";
import PrismaService from "./PrismaService.js";
import RPCManagerService from "./RPCManagerService.js";
import SnowflakeService from "./SnowflakeService.js";
import {
	resolveURLsPostLike,
	resolveURLsUploads,
} from "../../web/utils/UploadUtils.js";

// type snowflake = string;

export interface NotificationPayload {
	amount?: number;
	price?: string;
	text?: string;
	time?: string;
	mailto?: string;
	link?: string;
	timeLeft?: string;
	postImage?: string;
	rejected?: boolean;
	accepted?: boolean;
	strike?: number;
	from?: string;
	to?: string;
}

export interface NotificationCreateOptions {
	/**
	 * Type of the notification
	 */
	type: NotificationType;

	/**
	 * Array of User IDs mentioned in the notification.
	 */
	users?: User[] | bigint[];

	/**
	 * Comment ID mentioned in the notification.
	 */
	comment?: Comment | bigint;

	/**
	 * Post ID mentioned in the notification.
	 */
	post?: Post | bigint;

	/**
	 * Profile ID of the creator mentioned in the notification.
	 */
	creator?: Profile | bigint;

	/**
	 * Role ID mentioned in the notification.
	 */
	role?: Role | bigint;

	/**
	 * Amount of likes or new subscribers
	 */
	amount?: number;

	/**
	 * Price with currency, in '1234 USD' form
	 */
	price?: string;

	text?: string;
	time?: Date;
	timeLeft?: Date;
	mailto?: string;
	link?: string;
	postImage?: string;
	rejected?: boolean;
	accepted?: boolean;

	/**
	 * Amount of strikes the user received
	 */
	strike?: number;

	/**
	 * Previous price with currency, in '1234 USD' form
	 */
	from?: string;

	/**
	 * New price with currency, in '1234 USD' form
	 */
	to?: string;
}

function extractId<T extends { id: bigint }>(
	obj: T | bigint | undefined,
): bigint | undefined {
	if (typeof obj === "undefined" || obj == null) return undefined;

	return typeof obj === "bigint" ? obj : obj.id;
}

@Injectable()
class NotificationService {
	readonly #snowflake: SnowflakeService;
	readonly #prisma: PrismaService;
	readonly #rpc: RPCManagerService;
	readonly #cloudflareStream: CloudflareStreamService;
	readonly #mediaUpload: MediaUploadService;
	readonly #logger: Logger;
	readonly #notificationLimit = 100;

	constructor(
		snowflake: SnowflakeService,
		prisma: PrismaService,
		rpc: RPCManagerService,
		cloudflareStream: CloudflareStreamService,
		mediaUpload: MediaUploadService,
		logger: Logger,
	) {
		this.#snowflake = snowflake;
		this.#prisma = prisma;
		this.#rpc = rpc;
		this.#cloudflareStream = cloudflareStream;
		this.#mediaUpload = mediaUpload;
		this.#logger = logger;
	}

	/**
	 * Returns recent notifications for a user with all the data resolved
	 * @param userId The user to get notifications for
	 * @returns {Promise<INotification[]>} An array of notifications
	 */
	async getNotifications(userId: bigint): Promise<INotification[]> {
		const notifications = await this.#prisma.notification.findMany({
			orderBy: { id: "desc" },
			where: { userId },
			take: this.#notificationLimit,
			include: {
				comment: true,
				post: {
					include: {
						profile: {
							include: {
								user: true,
							},
						},
						postMedias: {
							include: {
								upload: true,
							},
						},
						thumbMedia: true,
					},
				},
				creator: true,
				role: true,
				users: {
					include: {
						user: {
							select: userBasicSelector,
						},
					},
				},
			},
		});

		await Promise.all(
			notifications.map(
				(n) =>
					n.post &&
					resolveURLsPostLike(
						n.post,
						this.#cloudflareStream,
						this.#mediaUpload,
					),
			),
		);

		const resolved: INotification[] = notifications.map((n) => ({
			...(n.payload as unknown as NotificationPayload),
			id: n.id.toString(),
			type: n.type,
			read: n.read,
			comment: n.comment
				? ModelConverter.toIComment(n.comment)
				: undefined,
			post: n.post ? ModelConverter.toIPost(n.post) : undefined,
			creator: n.creator
				? ModelConverter.toIProfile(n.creator)
				: undefined,
			role: n.role ? ModelConverter.toIRole(n.role) : undefined,
			users: n.users.map((u) => ModelConverter.toIUserBasic(u.user)),
		}));

		return resolved;
	}

	/**
	 * Creates and sends a notification to a user
	 * @param userId The user to create a notification for
	 * @param payload The notification payload
	 */
	async createNotification(
		userId: bigint,
		options: NotificationCreateOptions,
	) {
		const {
			type,
			users,
			comment,
			post,
			creator,
			role,
			time,
			timeLeft,
			...data
		} = options;

		const payload: NotificationPayload = {
			time: time?.toISOString(),
			timeLeft: timeLeft?.toISOString(),
			...data,
		};

		const commentId = extractId(comment);
		const postId = extractId(post);
		const creatorId = extractId(creator);
		const roleId = extractId(role);

		const id = this.#snowflake.gen();

		await this.#prisma.notification.create({
			data: {
				id,
				type,
				user: { connect: { id: userId } },
				payload: payload as PrismaJson<NotificationPayload>,
				...(commentId
					? {
							comment: {
								connect: { id: commentId },
							},
					  }
					: {}),
				...(postId
					? {
							post: {
								connect: { id: postId },
							},
					  }
					: {}),
				...(creatorId
					? {
							creator: {
								connect: { id: creatorId },
							},
					  }
					: {}),
				...(roleId
					? {
							role: {
								connect: { id: roleId },
							},
					  }
					: {}),
				users: {
					create: (users ?? []).map((u) => ({
						user: { connect: { id: extractId(u)! } },
					})),
				},
			},
		});

		this.#cleanOldNotifications(userId).catch((e) =>
			this.#logger.error(e, "Failed to clean old notifications."),
		);

		// TODO: Push notifications.
	}

	/**
	 * Marks a notification as read
	 * @param userId The ID of user whose notification should be marked as read
	 * @param notificationIds The IDs of notification to mark as read
	 */
	async markAsRead(userId: bigint, notificationIds: bigint[]) {
		await this.#prisma.notification.updateMany({
			where: { id: { in: notificationIds } },
			data: { read: true },
		});
	}

	/**
	 * Marks all notifications of specified user as read
	 * @param userId The ID of user whose notifications should be marked as read
	 */
	async markAllAsRead(userId: bigint) {
		await this.#prisma.notification.updateMany({
			where: { userId },
			data: { read: true },
		});
	}

	/**
	 * Sends a notification about an interaction with a post. Handles stacking and self-likes.
	 * @param interactedPostId ID of the post that was liked
	 * @param userId ID of the user who liked the post
	 */
	async sendPostInteractionNotification(
		interactedPostId: bigint,
		userId: bigint,
		type: NotificationType,
	) {
		const post = await this.#prisma.post.findUnique({
			include: {
				profile: {
					select: {
						user: { select: { id: true } },
					},
				},
			},
			where: { id: interactedPostId },
		});

		if (!post) return;

		const postCreatorId = post.profile.user?.id;

		if (!postCreatorId) return;
		if (postCreatorId === userId) return;

		const lastNotification = await this.#getLastNotification(postCreatorId);
		if (
			lastNotification?.type === type &&
			lastNotification?.postId === interactedPostId
		) {
			await this.#appendUsersToNotification(lastNotification.id, [
				userId,
			]);
			return;
		}

		await this.createNotification(postCreatorId, {
			type,
			users: [userId],
			post,
		});
	}

	async removePostInteractionFromNotification(
		interactedPostId: bigint,
		userId: bigint,
		type: NotificationType,
	) {
		const notification = await this.#prisma.notification.findFirst({
			where: {
				postId: interactedPostId,
				type,
				users: {
					some: {
						userId,
					},
				},
			},
		});

		if (!notification) return;

		await this.#prisma.notificationUser.delete({
			where: {
				notificationId_userId: {
					notificationId: notification.id,
					userId,
				},
			},
		});

		const deleted = await this.#prisma.$executeRaw`
			DELETE FROM "notifications" WHERE "id" = ${notification.id} AND NOT EXISTS (
				SELECT 1 FROM "notification_user" nu WHERE nu."notificationId" = notifications.id
			);`;
	}

	/**
	 * Removes old notifications for a user
	 * @param userId The user to remove notifications for
	 * @private
	 */
	async #cleanOldNotifications(userId: bigint) {
		this.#prisma.$executeRaw`
			DELETE FROM "notifications" WHERE "userId" = ${userId} AND "id" NOT IN (
				SELECT "id" FROM "notifications" WHERE "userId" = ${userId} ORDER BY "id" DESC LIMIT ${
					this.#notificationLimit
				}
			);`;
	}

	async #getLastNotification(userId: bigint) {
		return this.#prisma.notification.findFirst({
			orderBy: { id: "desc" },
			where: { userId },
		});
	}

	async #appendUsersToNotification(notificationId: bigint, users: bigint[]) {
		if (users.length === 0) return;

		await this.#prisma.notification
			.update({
				where: { id: notificationId },
				data: {
					read: false,
					users: {
						create: users.map((u) => ({
							user: {
								connect: { id: u },
							},
						})),
					},
				},
			})
			.catch(() => void 0);
	}
}

export async function notificationFactory(injector: Injector) {
	const snowflake = await injector.resolve(SnowflakeService);
	const prisma = await injector.resolve(PrismaService);
	const rpc = await injector.resolve(RPCManagerService);
	const cloudflareStream = await injector.resolve(CloudflareStreamService);
	const mediaUpload = await injector.resolve(MediaUploadService);
	const logger = await injector.resolve<Logger>("logger");

	return new NotificationService(
		snowflake,
		prisma,
		rpc,
		cloudflareStream,
		mediaUpload,
		logger,
	);
}

export default NotificationService;
