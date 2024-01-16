import * as LibPhoneNumberJS from "libphonenumber-js";
import { Prisma, SubscriptionStatus, TransactionStatus } from "@prisma/client";
import {
	VerifyPasswordResult,
	generatePasswordHashSalt,
	verifyPassword,
} from "../../../common/auth/Hashing.js";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import { SendEmailData } from "../../../common/service/EmailerService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import EmailerService from "../../../common/service/EmailerService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { genOTP } from "../../../common/utils/OTPGenerator.js";
import { IdParams, PageQuery } from "../../../common/validators/schemas.js";
import {
	IdParamsValidator,
	PageQueryValidator,
	QueryParamsValidator,
} from "../../../common/validators/validation.js";
import {
	deleteAccountEmailTemplate,
	updateEmailContent,
} from "../../../constants/email-template/Templates.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import * as CommonValidation from "./../../../common/Validation.js";
import { FastifyTypebox } from "./../../types.js";
import {
	AnalyticsPostsRespBody,
	AnalyticsSubscribersRespBody,
	AnalyticsTransactionsRespBody,
	ChangePasswordReqBody,
	UpdateEmailReqBody,
	VerifyDeleteAccountReqBody,
	VerifyNewEmailReqBody,
	UpdateSettingReqBody,
	CameoSettingsUpdateReqBody,
	FanProfileSettingsUpdateReqBody,
} from "./schemas.js";
import {
	ChangePasswordReqBodyValidator,
	UpdateEmailReqBodyValidator,
	UpdateSettingReqBodyValidator,
	VerifyDeleteAccountReqBodyValidator,
	VerifyNewEmailReqBodyValidator,
	CameoSettingsUpdateReqBodyValidator,
	FanProfileUpdateReqBodyValidator,
} from "./validation.js";

import { FastifyReply, FastifyRequest } from "fastify";

import { SocialMediaTypes } from "../../../constants/socialMediaTypes.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const session = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);
	const emailService = await container.resolve(EmailerService);

	fastify.post<{ Body: ChangePasswordReqBody }>(
		"/change-password",
		{
			schema: { body: ChangePasswordReqBodyValidator },
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const session = request.session!;
			const { oldPassword, newPassword } = request.body;

			const user = await prisma.user.findFirst({
				where: {
					id: BigInt(session.userId),
				},
			});
			if (!user) return reply.sendError(APIErrors.USER_NOT_FOUND);

			const result = await verifyPassword(oldPassword, user.password);
			if (result !== VerifyPasswordResult.OK) {
				return reply.sendError(APIErrors.INCORRECT_PASSWORD);
			}

			session.destroyOtherSessions();

			await prisma.user.update({
				where: { id: BigInt(session.userId) },
				data: {
					password: await generatePasswordHashSalt(newPassword),
				},
			});
			return reply.send();
		},
	);

	fastify.post<{ Body: UpdateSettingReqBody }>(
		"/update",
		{
			schema: { body: UpdateSettingReqBodyValidator },
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const session = request.session!;
			const {
				username,
				birthdate,
				phonenumber,
				country,
				displayName,
				gender,
				language,
				isShowProfile,
			} = request.body;
			const phoneNumber = phonenumber
				? LibPhoneNumberJS.parsePhoneNumber(phonenumber)
				: undefined;

			if (username !== undefined) {
				if (!CommonValidation.isUsernameValid(username)) {
					return reply.sendError(APIErrors.INVALID_USERNAME);
				}
				const userCount = await prisma.user.count({
					where: {
						id: { not: BigInt(session.userId) },
						username: {
							equals: username,
							mode: "insensitive",
						},
					},
				});
				if (userCount > 0) {
					return reply.sendError(APIErrors.DUPLICATE_USERNAME);
				}
				const profile = await prisma.profile.findFirst({
					where: { userId: BigInt(session.userId) },
				});
				if (profile) {
					await prisma.profile.update({
						where: { userId: BigInt(session.userId) },
						data: {
							profileLink: username,
						},
					});
				}
			}

			await prisma.user.update({
				where: { id: BigInt(session.userId) },
				data: {
					birthdate,
					country,
					displayName,
					gender,
					isShowProfile,
					language,
					phonenumber: phoneNumber?.formatInternational(),
					username,
				},
			});
			reply.send();
		},
	);

	fastify.post<{ Body: UpdateEmailReqBody }>(
		"/update-email",
		{
			schema: { body: UpdateEmailReqBodyValidator },
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const session = request.session!;
			const { email } = request.body;

			const user = await prisma.user.findFirst({
				where: { email: email },
			});

			if (user) {
				return reply.sendError(APIErrors.DUPLICATE_EMAIL);
			}

			const otpCode = await prisma.oTPCode.create({
				data: {
					id: snowflake.gen(),
					code: genOTP(6),
					userId: BigInt(session.userId),
				},
			});

			// todo: Send verification email to user
			const emailData: SendEmailData = {
				sender: process.env.SENDINBLUE_SENDER || "noreply@fyp.fans",
				to: [email.toLowerCase()],
				htmlContent: updateEmailContent(otpCode.code),
				subject: "Verify your email!",
			};
			await emailService.sendEmail(emailData);

			return reply.send();
		},
	);

	fastify.post<{ Body: VerifyNewEmailReqBody }>(
		"/verify-new-email",
		{
			schema: {
				body: VerifyNewEmailReqBodyValidator,
			},
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const { code, newEmail } = request.body;
			const session = request.session!;
			const user = await prisma.user.findFirst({
				where: {
					id: BigInt(session.userId),
				},
			});
			if (!user) {
				return reply.sendError(APIErrors.USER_NOT_FOUND);
			}

			const otp = await prisma.oTPCode.findFirst({
				where: { code: code, userId: BigInt(session.userId) },
			});

			if (!otp) {
				return reply.sendError(
					APIErrors.INVALID_REQUEST("Code is invalid!"),
				);
			}

			await Promise.all([
				prisma.oTPCode.delete({ where: { id: otp.id } }),
				prisma.user.update({
					where: { id: user.id },
					data: { email: newEmail },
				}),
			]);

			return reply.send();
		},
	);

	fastify.post<{ Body: {} }>(
		"/delete-account",
		{
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await prisma.user.findFirst({
				where: { id: BigInt(session.userId) },
			});
			if (!user) {
				return reply.sendError(APIErrors.USER_NOT_FOUND);
			}

			const otpCode = await prisma.oTPCode.create({
				data: {
					id: snowflake.gen(),
					code: genOTP(6),
					userId: BigInt(session.userId),
				},
			});
			const emailData: SendEmailData = {
				sender: process.env.SENDINBLUE_SENDER || "noreply@fyp.fans",
				to: [user.email.toLowerCase()],
				htmlContent: deleteAccountEmailTemplate(otpCode.code),
				subject: "Verify your email!",
			};
			await emailService.sendEmail(emailData);

			return reply.send();
		},
	);

	fastify.post<{ Body: VerifyDeleteAccountReqBody }>(
		"/verify-delete-account",
		{
			schema: { body: VerifyDeleteAccountReqBodyValidator },
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const { code } = request.body;
			const session = request.session!;
			const user = await prisma.user.findFirst({
				where: {
					id: BigInt(session.userId),
				},
			});
			if (!user) {
				return reply.sendError(APIErrors.USER_NOT_FOUND);
			}

			const otp = await prisma.oTPCode.findFirst({
				where: { AND: [{ code }, { userId: BigInt(session.userId) }] },
			});

			if (!otp) {
				return reply.sendError(
					APIErrors.INVALID_REQUEST("Code is invalid!"),
				);
			}

			// await Promise.all([
			// 	prisma.oTPCode.delete({ where: { id: otp.id } }),
			// 	prisma.user.delete({ where: { id: user.id } }),
			// ]);

			return reply.send();
		},
	);

	fastify.get<{ Querystring: PageQuery & { query?: string } }>(
		"/analytics-transaction",
		{
			schema: {
				params: QueryParamsValidator,
				querystring: PageQueryValidator,
			},
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const {
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				query = "",
			} = request.query;

			const total = await prisma.paymentSubscriptionTransaction.count({
				where: {
					creatorId: profile.id,
					user: {
						username: {
							contains: query,
							mode: "insensitive",
						},
					},
				},
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const transactions =
				await prisma.paymentSubscriptionTransaction.findMany({
					where: {
						creatorId: profile.id,
						user: {
							username: {
								contains: query,
								mode: "insensitive",
							},
						},
					},
					include: { user: true },
					skip: (page - 1) * size,
					take: size,
				});

			const result: AnalyticsTransactionsRespBody = {
				transactions: transactions.map((t) => ({
					...ModelConverter.toIPaymentSubscriptionTransaction(t),
					user: ModelConverter.toIUser(t.user),
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Querystring: PageQuery }>(
		"/analytics-post",
		{
			schema: {
				querystring: PageQueryValidator,
			},
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;

			const total = await prisma.post.count({
				where: { profileId: profile.id },
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const [
				posts,
				bookmarks,
				comments,
				postLikes,
				paidPostTransactions,
			] = await Promise.all([
				prisma.post.findMany({
					where: {
						profileId: profile.id,
					},
					include: {
						thumbMedia: true,
						postMedias: {
							include: { upload: true },
						},
						roles: true,
						tiers: true,
						users: true,
						_count: {
							select: {
								bookmarks: true,
								postLikes: true,
								comments: true,
							},
						},
					},
					skip: (page - 1) * size,
					take: size,
				}),
				prisma.bookmark.findMany({
					where: { userId: BigInt(session.userId) },
					select: { postId: true },
				}),
				prisma.comment.findMany({
					where: { userId: BigInt(session.userId) },
					select: { postId: true },
				}),
				prisma.postLike.findMany({
					where: { userId: BigInt(session.userId) },
					select: { postId: true },
				}),
				prisma.paidPostTransaction.findMany({
					where: {
						userId: BigInt(session.userId),
						status: { in: [TransactionStatus.Successful] },
					},
					include: { paidPost: true },
				}),
			]);

			const result: AnalyticsPostsRespBody = {
				posts: posts.map((p) =>
					ModelConverter.toIPost(p, {
						isBookmarked: bookmarks
							.map((b) => b.postId)
							.includes(p.id),
						isCommented: comments
							.map((c) => c.postId)
							.includes(p.id),
						isLiked: postLikes.map((p) => p.postId).includes(p.id),
						isPaidOut: paidPostTransactions
							.map((ppt) => ppt.paidPost.postId)
							.includes(p.id),
						isSelf: p.profileId === profile.id,
						isExclusive:
							p.roles.length > 0 ||
							p.tiers.length > 0 ||
							p.users.length > 0,
					}),
				),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Querystring: PageQuery & { query?: string } }>(
		"/analytics-subscriber",
		{
			schema: {
				params: QueryParamsValidator,
				querystring: PageQueryValidator,
			},
			preHandler: [
				session.sessionPreHandler,
				session.requireAuthHandler,
				session.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const {
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				query = "",
			} = request.query;

			const total = await prisma.paymentSubscription.count({
				where: {
					creatorId: profile.id,
					user: {
						username: {
							contains: query,
							mode: "insensitive",
						},
					},
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
			});
			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const subscriptions = await prisma.paymentSubscription.findMany({
				where: {
					creatorId: profile.id,
					user: {
						username: {
							contains: query,
							mode: "insensitive",
						},
					},
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
				include: {
					user: true,
					paymentSubscriptionTransactions: true,
				},
				skip: (page - 1) * size,
				take: size,
			});

			const result: AnalyticsSubscribersRespBody = {
				subscriptions: subscriptions.map((s) => ({
					...ModelConverter.toIPaymentSubscription(s),
					user: ModelConverter.toIUser(s.user),
					paymentSubscriptionTransactions:
						s.paymentSubscriptionTransactions.map((t) =>
							ModelConverter.toIPaymentSubscriptionTransaction(t),
						),
				})),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);

	fastify.get<{ Params: { userId: string } }>(
		"/user-settings/",
		{
			preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		},
		async (request, reply) => {
			const session = request.session!;
			const userId = BigInt(session.userId);

			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user?.settings) {
				const newSettings = await createInitialSettings(
					BigInt(session.userId),
				);
				const { settings } = newSettings;

				return reply.send(settings);
			} else {
				const settingsObject: Prisma.JsonObject =
					user.settings as Prisma.JsonObject;
				// because of evolving confs, double check and create
				// settings object
				if (!settingsObject.cameo) {
					settingsObject.cameo = { ...defaultCameoSettings };
				}
				if (!settingsObject.fanProfile) {
					settingsObject.fanProfile = {
						...defaultFanProfileSettings,
					};
				}
				const newSettings = await prisma.user.update({
					where: { id: userId },
					data: {
						settings: settingsObject,
					},
				});

				return reply.send(newSettings.settings);
			}
		},
	);

	fastify.put<{
		Params: { settingsType: string };
		Body: CameoSettingsUpdateReqBody;
	}>("/user-settings/cameo", {
		preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		schema: {
			body: CameoSettingsUpdateReqBodyValidator,
		},
		handler: async (request, reply) => {
			return handleCameoSettings(request, reply);
		},
	});

	fastify.put<{
		Params: { settingsType: string };
		Body: FanProfileSettingsUpdateReqBody;
	}>("/user-settings/fanProfile", {
		preHandler: [session.sessionPreHandler, session.requireAuthHandler],
		schema: {
			body: FanProfileUpdateReqBodyValidator,
		},
		handler: async (request, reply) => {
			return handleFanProfileSettings(request, reply);
		},
	});

	const handleCameoSettings = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const body = request.body as CameoSettingsUpdateReqBody;
		const session = request.session!;
		const userId = BigInt(session.userId);

		const user = await prisma.user.findFirst({
			where: {
				id: BigInt(session.userId),
			},
		});
		if (!user) return reply.sendError(APIErrors.USER_NOT_FOUND);

		const data = body.cameo;

		const cameoSettings = {
			pricesDuration: data.pricesDuration?.map((priceDuration) => ({
				price: priceDuration.price,
				duration: priceDuration.duration,
				active: priceDuration.active,
			})),
			contentPreferences: data.contentPreferences,
			tos: data.tos,
			requestLimitations: data.requestLimitations,
			responseDescription: data.responseDescription,
			uploadPreviews: data.uploadPreviews,
			sexualContent: data.sexualContent,
			notifications: {
				newRequests: data.notifications?.newRequests,
				pendingVideos: data.notifications?.pendingVideos,
				completedRequests: data.notifications?.completedRequests,
				notificationsByPhone: data.notifications?.notificationsByPhone,
				notificationsByEmail: data.notifications?.notificationsByEmail,
			},
			customVideoOrdersEnabled: data.customVideoOrdersEnabled,
			vacationMode: data.vacationMode,
			vacationModeInterval: data.vacationModeInterval,
			videoCallsEnabled: data.videoCallsEnabled,
			additionalContentPreferences: data.additionalContentPreferences,
		};
		const currentSettings = JSON.parse(JSON.stringify(user?.settings));

		const updatedUserSettings = await prisma.user.update({
			where: { id: userId },
			data: {
				settings: {
					...currentSettings,
					cameo: cameoSettings,
				},
			},
		});
		return reply.status(201).send(updatedUserSettings.settings);
	};

	const handleFanProfileSettings = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const body = request.body as FanProfileSettingsUpdateReqBody;
		const session = request.session!;
		const userId = BigInt(session.userId);

		const user = await prisma.user.findFirst({
			where: {
				id: BigInt(session.userId),
			},
		});
		if (!user) return reply.sendError(APIErrors.USER_NOT_FOUND);

		const data = body.fanProfile;

		const fanProfileSettings = {
			socialMedias: data.socialMedias?.map((socialMedia) => ({
				id: socialMedia.id,
				value: socialMedia.value,
				title: socialMedia.title,
			})),
			bio: data.bio,
			displayName: data.displayName,
			theme: data.theme,
		};
		const currentSettings = JSON.parse(JSON.stringify(user?.settings));

		const updatedUserSettings = await prisma.user.update({
			where: { id: userId },
			data: {
				settings: {
					...currentSettings,
					fanProfile: fanProfileSettings,
				},
			},
		});
		return reply.status(201).send(updatedUserSettings.settings);
	};
	const defaultCameoSettings = {
		pricesDuration: [],
		contentPreferences: [],
		tos: false,
		requestLimitations: {
			fulFillmentTimeFrame: "",
			numberRequestsType: "",
			numberRequestsValue: 0,
		},
		sexualContent: false,
		responseDescription: "",
		uploadPreviews: [],
		notifications: {
			newRequests: false,
			pendingVideos: false,
			completedRequests: false,
			notificationsByPhone: true,
			notificationsByEmail: true,
		},
		customVideoOrdersEnabled: false,
		vacationMode: false,
		vacationModeInterval: { startDate: "", endDate: "" },
		videoCallsEnabled: false,
		additionalContentPreferences: "",
	};

	const generateSocialMediaUrls = () => {
		return SocialMediaTypes.map((socialMedia) => ({
			id: socialMedia,
			value: "",
			title:
				socialMedia.charAt(0).toUpperCase() +
				socialMedia.slice(1).toLowerCase(),
		}));
	};

	const defaultFanProfileSettings = {
		displayName: "",
		bio: "",
		socialMedias: generateSocialMediaUrls(),
	};

	const createInitialSettings = async (id: bigint) => {
		const updatedUserSettings = await prisma.user.update({
			where: { id },
			data: {
				settings: {
					cameo: { ...defaultCameoSettings },
					fanProfile: { ...defaultFanProfileSettings },
				},
			},
		});

		return updatedUserSettings;
	};
}
