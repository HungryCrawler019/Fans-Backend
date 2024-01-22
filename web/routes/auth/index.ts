import { FastifyPluginOptions, FastifyRequest } from "fastify";
import pwdStrength from "pwd-strength";
import APIErrors from "../../errors/index.js";
import { isEmailValid, isUsernameValid } from "../../../common/Validation.js";
import {
	VerifyPasswordResult,
	generatePasswordHashSalt,
	verifyPassword,
} from "../../../common/auth/Hashing.js";
import { SendEmailData } from "../../../common/service/EmailerService.js";
import OAuth2Service from "../../../common/service/OAuth2Service.js";
import PrismaService from "../../../common/service/PrismaService.js";
import EmailerService from "../../../common/service/EmailerService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import GemExchangeService from "../../../common/service/GemExchangeService.js";
import SiftService from "../../../common/service/SiftService.js";
import { generateUsername } from "../../../common/utils/UsernameGenerator.js";
import {
	RegisterEmailContent,
	verifyCodeHTML,
} from "../../../constants/email-template/Templates.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import {
	AuthForgotPasswordReqBody,
	AuthOAuth2AuthorizeReqBody,
	AuthOAuth2AuthorizeReqParams,
	AuthOAuth2LinkListRespBody,
	AuthOAuth2LinkReqBody,
	AuthOAuth2LinkReqParams,
	AuthOAuth2LinkRespBody,
	AuthPasswordLoginReqBody,
	AuthPasswordRegisterReqBody,
	AuthPasswordVerifyRegisterReqBody,
	AuthResendReqBody,
	AuthUserInfoRespBody,
	AuthVerifyCodeReqBody,
	TokenRespBody,
} from "./schemas.js";
import {
	AuthForgotPasswordReqBodyValidator,
	AuthOAuth2AuthorizeReqBodyValidator,
	AuthOAuth2AuthorizeReqParamsValidator,
	AuthOAuth2LinkReqBodyValidator,
	AuthOAuth2LinkReqParamsValidator,
	AuthPasswordLoginReqBodyValidator,
	AuthPasswordRegisterReqBodyValidator,
	AuthPasswordVerifyRegisterReqBodyValidator,
	AuthResendReqBodyValidator,
	AuthResetPasswordReqBodyValidator,
	AuthVerifyCodeReqBodyValidator,
} from "./validation.js";
import { genOTP } from "../../../common/utils/OTPGenerator.js";
import { User } from "@prisma/client";

const DECIMAL_TO_CENT_FACTOR = 100;

export default async function routes(
	fastify: FastifyTypebox,
	options: FastifyPluginOptions,
) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const sessionManager = await container.resolve(SessionManagerService);
	const oauth2 = await container.resolve(OAuth2Service);
	const gemExchange = await container.resolve(GemExchangeService);
	const emailService = await container.resolve(EmailerService);
	const siftService = await container.resolve(SiftService);

	const generateUsernameChecked = async () => {
		for (let i = 0; i < 10000; i++) {
			const username = generateUsername();
			const existingUser = await prisma.user.findFirst({
				where: {
					username: {
						equals: username,
						mode: "insensitive",
					},
				},
			});

			if (!existingUser) {
				return username;
			}
		}
		throw new Error("Attempts exceeded");
	};

	const siftLogin = (
		user: User | null,
		request: FastifyRequest,
		status: "$success" | "$failure",
		reason?:
			| "$account_unknown"
			| "$account_suspended"
			| "$account_disabled"
			| "$wrong_password",
	) => {
		if (!user) return;
		return siftService.login({
			$user_id: user.id.toString(),
			$user_email: user.email,
			$username: user.username,
			$ip: request.ip,
			$login_status: status,
			$failure_reason: reason,
			$browser: {
				$user_agent: request.headers["user-agent"],
				$accept_language: request.headers["accept-language"],
			},
		});
	};

	fastify.post<{ Body: AuthPasswordRegisterReqBody }>(
		"/register",
		{
			config: {
				rateLimit: {},
			},
			schema: { body: AuthPasswordRegisterReqBodyValidator },
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			if (request.session) {
				return reply.sendError(APIErrors.ALREADY_AUTHORIZED);
			}

			const { email, username } = request.body;
			if (username != undefined && !isUsernameValid(username)) {
				return reply.sendError(APIErrors.REGISTER_INVALID_USERNAME);
			}

			const lowerCaseEmail = email.toLowerCase();

			if (!isEmailValid(lowerCaseEmail)) {
				return reply.sendError(APIErrors.REGISTER_INVALID_EMAIL);
			}

			const existingUser = await prisma.user.findFirst({
				where: {
					OR: [
						{
							email: {
								equals: lowerCaseEmail,
								mode: "insensitive",
							},
						},
						{ username: { equals: username, mode: "insensitive" } },
					],
				},
			});

			if (existingUser) {
				return reply.sendError(
					existingUser.email === lowerCaseEmail
						? APIErrors.REGISTER_EMAIL_IN_USE
						: APIErrors.TAKEN_USERNAME,
				);
			}

			await prisma.oTPCode.deleteMany({
				where: { email },
			});

			const otpCode = await prisma.oTPCode.create({
				data: {
					id: snowflake.gen(),
					code: genOTP(6),
					email: email,
				},
			});

			// todo: Send verification email to user
			const emailData: SendEmailData = {
				sender: process.env.SENDINBLUE_SENDER || "noreply@fyp.fans",
				to: [lowerCaseEmail],
				htmlContent: RegisterEmailContent(otpCode.code),
				subject: "Verify your account!",
			};
			await emailService.sendEmail(emailData);

			return reply.status(202).send();
		},
	);

	fastify.post<{ Body: AuthPasswordVerifyRegisterReqBody }>(
		"/verify-register",
		{
			config: {
				rateLimit: {},
			},
			schema: { body: AuthPasswordVerifyRegisterReqBodyValidator },
			preHandler: [sessionManager.sessionPreHandler],
		},
		async (request, reply) => {
			if (request.session) {
				return reply.sendError(APIErrors.ALREADY_AUTHORIZED);
			}

			const { code, email, username, password } = request.body;
			if (username != undefined && !isUsernameValid(username)) {
				return reply.sendError(APIErrors.REGISTER_INVALID_USERNAME);
			}

			const lowerCaseEmail = email.toLowerCase();

			if (!isEmailValid(lowerCaseEmail)) {
				return reply.sendError(APIErrors.REGISTER_INVALID_EMAIL);
			}

			const strengthCheck = pwdStrength(password, {
				minNumberChars: 0,
				minUpperChars: 0,
				minLowerChars: 0,
				minSpecialChars: 0,
				minPasswordLength: 8,
			});

			if (!strengthCheck.success) {
				return reply.sendError(
					APIErrors.REGISTER_INVALID_PASSWORD(strengthCheck.message),
				);
			}

			const existingUser = await prisma.user.findFirst({
				where: {
					OR: [
						{
							email: {
								equals: lowerCaseEmail,
								mode: "insensitive",
							},
						},
						{ username: { equals: username, mode: "insensitive" } },
					],
				},
			});

			if (existingUser) {
				return reply.sendError(
					existingUser.email === lowerCaseEmail
						? APIErrors.REGISTER_EMAIL_IN_USE
						: APIErrors.TAKEN_USERNAME,
				);
			}

			const passwordHash = await generatePasswordHashSalt(password);
			const otpCode = await prisma.oTPCode.findFirst({
				where: {
					email,
					code,
				},
			});

			if (!otpCode) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("OTP"));
			}

			const [_, created] = await Promise.all([
				prisma.oTPCode.delete({
					where: { id: otpCode.id },
				}),
				prisma.user.create({
					data: {
						id: snowflake.gen(),
						email: lowerCaseEmail,
						username,
						displayName: "",
						password: passwordHash,
						verifiedAt: new Date(),
						gems: { create: { id: snowflake.gen() } },
						popupStatus: { create: { id: snowflake.gen() } },
						notificationsSettings: {
							create: { id: snowflake.gen() },
						},
					},
				}),
			]);

			const session = await sessionManager.createSessionForUser(
				created.id.toString(),
			);
			const result: TokenRespBody = {
				token: session.createToken(),
			};
			await siftService.createAccount({
				$user_id: created.id.toString(),
				$user_email: request.body.email,
				$ip: request.ip,
				$browser: {
					$user_agent: request.headers["user-agent"],
					$accept_language: request.headers["accept-language"],
				},
			});
			return reply.send(result);
		},
	);

	fastify.post<{ Body: AuthPasswordLoginReqBody }>(
		"/login",
		{
			schema: { body: AuthPasswordLoginReqBodyValidator },
		},
		async (request, reply) => {
			const { email, password } = request.body;
			const user = await prisma.user.findFirst({
				where: {
					OR: [
						{
							email: {
								equals: email,
								mode: "insensitive",
							},
						},
						{
							username: {
								equals: email,
								mode: "default",
							},
						},
					],
				},
			});

			if (!user || !user.password) {
				siftLogin(user, request, "$failure", "$account_unknown");
				return reply.sendError(APIErrors.LOGIN_INVALID_CREDENTIALS);
			}

			if (user.disabled) {
				siftLogin(user, request, "$failure", "$account_suspended");
				return reply.sendError(APIErrors.USER_BANNED);
			}

			if (!user.verifiedAt) {
				siftLogin(user, request, "$failure", "$account_suspended");
				return reply.sendError(APIErrors.USER_NOT_VERIFIED);
			}

			const result = await verifyPassword(password, user.password);
			if (result === VerifyPasswordResult.OK) {
				const session = await sessionManager.createSessionForUser(
					user.id.toString(),
				);
				const result: TokenRespBody = {
					token: session.createToken(),
				};
				const popupStatus = await prisma.popupStatus.findFirst({
					where: { userId: user.id },
				});
				if (popupStatus && !popupStatus?.loggedIn) {
					await prisma.popupStatus.update({
						where: { id: popupStatus.id },
						data: {
							loggedIn: true,
							showFairTransactionDialog: true,
						},
					});
				}
				siftLogin(user, request, "$success");
				return reply.send(result);
			} else {
				siftLogin(user, request, "$failure", "$wrong_password");
				return reply.sendError(APIErrors.LOGIN_INVALID_CREDENTIALS);
			}
		},
	);

	fastify.post<{ Body: {} }>(
		"/logout",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			await siftService.logout({
				$user_id: user?.id.toString(),
				$browser: {
					$user_agent: request.headers["user-agent"],
					$accept_language: request.headers["accept-language"],
				},
			});
			request.session?.destroy();
			return reply.send();
		},
	);

	fastify.get(
		"/user-info",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUserWithProfile(prisma);
			const [gemsBalance, payoutBalance] = await Promise.all([
				prisma.gemsBalance.findFirst({
					where: { userId: BigInt(session.userId) },
				}),
				user.profile
					? prisma.balance.findFirst({
							where: { profileId: BigInt(user.profile.id) },
					  })
					: null,
			]);

			let gems = 0;
			let gemsAmount = 0;
			let payoutBalanceAmount = 0;

			if (gemsBalance?.amount) {
				gems = gemExchange
					.gemExchangeBack(gemsBalance.amount)
					.getAmount();
				gemsAmount = gemsBalance.amount / DECIMAL_TO_CENT_FACTOR;
			}

			if (payoutBalance?.amount) {
				payoutBalanceAmount =
					payoutBalance.amount / DECIMAL_TO_CENT_FACTOR;
			}

			const result: AuthUserInfoRespBody = {
				...ModelConverter.toIUser(user, true),
				profile: user.profile
					? ModelConverter.toIProfile(user.profile)
					: undefined,
				viewedStoryCreators: user.storyViewers
					? user.storyViewers.map((sv) =>
							ModelConverter.toIStoryViewer(sv),
					  )
					: undefined,
				gems,
				gemsAmount,
				payoutBalance: payoutBalanceAmount,
				linkedAccounts: user.linkedAccounts
					? user.linkedAccounts.map((l) =>
							ModelConverter.toIOAuth2LinkedAccount(l),
					  )
					: undefined,
				fanReferrals: user.fanReferrals?.map((f) =>
					ModelConverter.toIFanReferral(f),
				),
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Body: AuthForgotPasswordReqBody }>(
		"/forgot-password",
		{
			schema: {
				body: AuthForgotPasswordReqBodyValidator,
			},
		},
		async (request, reply) => {
			// verify user is exist
			const { email } = request.body;
			const user = await prisma.user.findFirst({
				where: {
					email: {
						equals: email,
						mode: "insensitive",
					},
				},
			});

			if (!user) {
				return reply.sendError(APIErrors.USER_NOT_FOUND);
			}

			if (user.disabled) {
				siftLogin(user, request, "$failure", "$account_suspended");
				return reply.sendError(APIErrors.USER_BANNED);
			}

			// check already exist OTP for it
			const otp = await prisma.oTPCode.findFirst({
				where: { userId: user.id },
			});
			if (otp) {
				// remove old otp
				await prisma.oTPCode.delete({ where: { id: otp.id } });
			}
			// create new otp for user
			const otpCode = await prisma.oTPCode.create({
				data: {
					id: snowflake.gen(),
					code: genOTP(6),
					userId: user.id,
				},
			});

			// send email for OTP code
			const emailData: SendEmailData = {
				sender: process.env.SENDINBLUE_SENDER || "support@fyp.fans",
				to: [user.email],
				htmlContent: verifyCodeHTML(otpCode.code),
				subject: "Verify your account",
			};
			await emailService.sendEmail(emailData);
			return reply.status(202).send();
		},
	);

	fastify.post<{ Body: AuthVerifyCodeReqBody }>(
		"/verify-code",
		{
			schema: {
				body: AuthVerifyCodeReqBodyValidator,
			},
		},
		async (request, reply) => {
			const { code, email } = request.body;
			const user = await prisma.user.findFirst({
				where: {
					email: {
						equals: email,
						mode: "insensitive",
					},
				},
			});
			if (!user) {
				return reply.sendError(APIErrors.USER_NOT_FOUND);
			}

			if (user.disabled) {
				siftLogin(user, request, "$failure", "$account_suspended");
				return reply.sendError(APIErrors.USER_BANNED);
			}

			const otp = await prisma.oTPCode.findFirst({
				where: { AND: [{ code }, { userId: { equals: user.id } }] },
			});

			if (!otp) {
				return reply.sendError(
					APIErrors.INVALID_REQUEST("Code is invalid!"),
				);
			}

			const session = await sessionManager.createSessionForUser(
				user.id.toString(),
			);

			const result: TokenRespBody = { token: session.createToken() };
			return reply.send(result);
		},
	);

	fastify.post<{ Body: AuthVerifyCodeReqBody }>(
		"/verify-account",
		{
			schema: {
				body: AuthVerifyCodeReqBodyValidator,
			},
		},
		async (request, reply) => {
			const { code, email } = request.body;
			const user = await prisma.user.findFirst({
				where: {
					email: {
						equals: email,
						mode: "insensitive",
					},
				},
			});
			if (!user) return reply.sendError(APIErrors.USER_NOT_FOUND);

			if (user.disabled) {
				siftLogin(user, request, "$failure", "$account_suspended");
				return reply.sendError(APIErrors.USER_BANNED);
			}

			const otp = await prisma.oTPCode.findFirst({
				where: {
					AND: [{ code }, { userId: user.id }],
				},
			});
			if (!otp) return reply.sendError(APIErrors.ITEM_NOT_FOUND("OTP"));

			await Promise.all([
				prisma.oTPCode.delete({
					where: { id: otp.id },
				}),
				prisma.user.update({
					where: { id: user.id },
					data: { verifiedAt: new Date() },
				}),
			]);

			const session = await sessionManager.createSessionForUser(
				user.id.toString(),
			);
			const result: TokenRespBody = {
				token: session.createToken(),
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Body: AuthResendReqBody }>(
		"/resend-verify-code",
		{
			schema: {
				body: AuthResendReqBodyValidator,
			},
		},
		async (request, reply) => {
			const { email, username } = request.body;
			const user = await prisma.user.findFirst({
				where: {
					email: {
						equals: email,
						mode: "insensitive",
					},
				},
			});
			if (!user) {
				if (!username) {
					return reply.sendError(APIErrors.USER_NOT_FOUND);
				} else {
					await prisma.oTPCode.deleteMany({
						where: { email },
					});
					// create new otp code
					const otpCode = await prisma.oTPCode.create({
						data: {
							id: snowflake.gen(),
							code: genOTP(6),
							email,
						},
					});

					// todo: Send verification email to user
					const emailData: SendEmailData = {
						sender:
							process.env.SENDINBLUE_SENDER || "noreply@fyp.fans",
						to: [email.toLowerCase()],
						htmlContent: RegisterEmailContent(otpCode.code),
						subject: "Verify your account!",
					};
					await emailService.sendEmail(emailData);
				}
			} else {
				if (user.disabled) {
					siftLogin(user, request, "$failure", "$account_suspended");
					return reply.sendError(APIErrors.USER_BANNED);
				}

				if (user.verifiedAt)
					return reply.sendError(
						APIErrors.INVALID_REQUEST(
							"User is already verified, if you forgot password, you can request reset password!",
						),
					);
				// delete otp if already exist for users
				await prisma.oTPCode.deleteMany({
					where: { userId: user.id },
				});
				// create new otp code
				const otpCode = await prisma.oTPCode.create({
					data: {
						id: snowflake.gen(),
						code: genOTP(6),
						userId: user.id,
					},
				});
				const emailData: SendEmailData = {
					sender: process.env.SENDINBLUE_SENDER || "noreply@fyp.fans",
					to: [email],
					htmlContent: RegisterEmailContent(otpCode.code),
					subject: "Verify your account!",
				};
				await emailService.sendEmail(emailData);
			}
			return reply.status(202).send();
		},
	);

	fastify.post<{
		Params: AuthOAuth2AuthorizeReqParams;
		Body: AuthOAuth2AuthorizeReqBody;
	}>(
		"/oauth2/authorize/:provider",
		{
			schema: {
				body: AuthOAuth2AuthorizeReqBodyValidator,
				params: AuthOAuth2AuthorizeReqParamsValidator,
			},
		},
		async (request, reply) => {
			const { provider } = request.params;
			const { code, redirectUri, codeVerifier } = request.body;
			const providerInstance = oauth2.getProvider(provider);

			if (!providerInstance) {
				return reply.sendError(APIErrors.OAUTH2_INVALID_PROVIDER);
			}

			const oauthProfile = await providerInstance.getUserWithCode(
				redirectUri,
				code,
				codeVerifier,
			);

			const account = await prisma.oAuth2LinkedAccount.findFirst({
				where: {
					provider: provider,
					accountId: oauthProfile.id,
				},
			});

			if (account) {
				const user = await prisma.user.findUniqueOrThrow({
					where: { id: account.userId },
				});

				if (user.disabled) {
					siftLogin(user, request, "$failure", "$account_suspended");
					return reply.sendError(APIErrors.USER_BANNED);
				}

				account.name = oauthProfile.name;
				account.email = oauthProfile.email.toLowerCase();
				account.avatarUrl = oauthProfile.avatarUrl ?? null;
				account.accessToken = oauthProfile.accessToken;
				account.refreshToken =
					oauthProfile.refreshToken ?? account.refreshToken ?? null;

				prisma.oAuth2LinkedAccount.update({
					where: { id: account.id },
					data: account,
				});

				const session = await sessionManager.createSessionForUser(
					account.userId.toString(),
				);

				const result: TokenRespBody = {
					token: session.createToken(),
				};
				return reply.send(result);
			}

			const existingUserByEmail = await prisma.user.findFirst({
				where: {
					email: { equals: oauthProfile.email },
				},
			});

			// in this case the user can regain access to their account by using the forgot password flow
			if (existingUserByEmail) {
				return reply.sendError(APIErrors.OAUTH2_EMAIL_IN_USE);
			}

			const newUserId = snowflake.gen();
			const username = await generateUsernameChecked();

			const [user] = await prisma.$transaction([
				prisma.user.create({
					data: {
						id: newUserId,
						email: oauthProfile.email,
						username,
						displayName: oauthProfile.name,
						password: "",
						verifiedAt: new Date(),
						gems: { create: { id: snowflake.gen() } },
						popupStatus: { create: { id: snowflake.gen() } },
						notificationsSettings: {
							create: { id: snowflake.gen() },
						},
					},
				}),
				prisma.oAuth2LinkedAccount.create({
					data: {
						id: snowflake.gen(),
						provider: provider,
						accountId: oauthProfile.id,
						name: oauthProfile.name,
						email: oauthProfile.email,
						avatarUrl: oauthProfile.avatarUrl ?? null,
						accessToken: oauthProfile.accessToken,
						userId: newUserId,
					},
				}),
			]);

			const session = await sessionManager.createSessionForUser(
				user.id.toString(),
			);

			const result: TokenRespBody = { token: session.createToken() };
			await siftService.createAccount({
				$user_id: user.id.toString(),
				$user_email: oauthProfile.email,
				$ip: request.ip,
				$browser: {
					$user_agent: request.headers["user-agent"],
					$accept_language: request.headers["accept-language"],
				},
			});
			return reply.send(result);
		},
	);

	fastify.post<{
		Body: AuthOAuth2LinkReqBody;
		Params: AuthOAuth2LinkReqParams;
	}>(
		"/oauth2/link/:provider",
		{
			schema: {
				body: AuthOAuth2LinkReqBodyValidator,
				params: AuthOAuth2LinkReqParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);
			const { provider } = request.params;
			const { redirectUri, code, codeVerifier } = request.body;
			const providerInstance = oauth2.getProvider(provider);

			if (!providerInstance) {
				return reply.sendError(APIErrors.OAUTH2_INVALID_PROVIDER);
			}

			const oauthProfile = await providerInstance.getUserWithCode(
				redirectUri,
				code,
				codeVerifier,
			);

			const account = await prisma.oAuth2LinkedAccount.findFirst({
				where: {
					provider: provider,
					accountId: oauthProfile.id,
				},
			});

			if (account) {
				return reply.sendError(APIErrors.OAUTH2_ALREADY_LINKED);
			}

			const created = await prisma.oAuth2LinkedAccount.create({
				data: {
					id: snowflake.gen(),
					provider: provider,
					accountId: oauthProfile.id,
					name: oauthProfile.name,
					email: oauthProfile.email.toLowerCase(),
					avatarUrl: oauthProfile.avatarUrl ?? null,
					accessToken: oauthProfile.accessToken,
					userId: user.id,
				},
			});

			const result: AuthOAuth2LinkRespBody = {
				linkedAccount: ModelConverter.toIOAuth2LinkedAccount(created),
			};
			return reply.send(result);
		},
	);

	fastify.delete<{
		Params: AuthOAuth2LinkReqParams;
	}>(
		"/oauth2/link/:provider",
		{
			schema: {
				params: AuthOAuth2LinkReqParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);
			const { provider } = request.params;

			if (!user.password || user.password.length === 0) {
				return reply.sendError(
					APIErrors.OAUTH2_UNABLE_UNLINK_WITHOUT_PASSWORD,
				);
			}

			const linked = await prisma.oAuth2LinkedAccount.findFirst({
				where: {
					provider,
					userId: user.id,
				},
			});

			if (!linked) {
				return reply.sendError(APIErrors.OAUTH2_NOT_LINKED);
			}

			await prisma.oAuth2LinkedAccount.delete({
				where: {
					id: linked.id,
				},
			});

			return reply.send({});
		},
	);

	fastify.get(
		"/oauth2/link-list",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const accounts = await prisma.oAuth2LinkedAccount.findMany({
				where: {
					user: { id: user.id },
				},
			});

			const accountList: AuthOAuth2LinkListRespBody = { links: {} };

			for (const account of accounts) {
				accountList.links[account.provider] = {
					id: account.id.toString(),
					accountId: account.accountId,
					email: account.email,
					name: account.name,
					avatarUrl: account.avatarUrl ?? undefined,
					linkedAt: SnowflakeService.extractDate(
						account.id,
					).toISOString(),
				};
			}

			return reply.send(accountList);
		},
	);
}
