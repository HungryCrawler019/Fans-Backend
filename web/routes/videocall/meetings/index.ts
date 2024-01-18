import { Logger } from "pino";
import { DateTime, Interval } from "luxon";
import dinero from "dinero.js";
import { TaxjarError } from "taxjar/dist/util/types.js";
import { TransactionStatus } from "@prisma/client";
import { setInterval } from "node:timers/promises";
import {
	DEFAULT_PAGE_SIZE,
	PaginatedQuery,
} from "../../../../common/pagination.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService, {
	Session,
} from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import AuthorizeNetService from "../../../../common/service/AuthorizeNetService.js";
import FeesCalculator from "../../../../common/service/FeesCalculatorService.js";
import SiftService from "../../../../common/service/SiftService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { FastifyTypebox } from "../../../types.js";
import {
	CreateMeetingBody,
	AcceptMeetingParams,
	GetChimeReply,
	MeetingsQuery,
} from "./schemas.js";
import {
	CreateMeetingBodyValidator,
	AcceptMeetingParamsValidator,
	MeetingQueryValidator,
} from "./validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { IMeeting } from "../../../CommonAPISchemas.js";
import APIErrors from "../../../errors/index.js";
import { MeetingService } from "../../../../common/service/MeetingService.js";

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;

	const logger = await container.resolve<Logger>("logger");
	const sessionManager = await container.resolve(SessionManagerService);
	const prisma = await container.resolve(PrismaService);
	const snowflake = await container.resolve(SnowflakeService);
	const meetingService = await container.resolve(MeetingService);
	const authorizeNetService = await container.resolve(AuthorizeNetService);
	const feesCalculator = await container.resolve(FeesCalculator);
	const siftService = await container.resolve(SiftService);

	fastify.post<{ Body: CreateMeetingBody }>(
		"/",
		{
			schema: { body: CreateMeetingBodyValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				authorizeNetService.webhookPrehandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const user = await session.getUser(prisma);

			// if (
			// 	request.body.customerPaymentProfileId !==
			// 	process.env.VIDEOCALL_BYPASS_PAYMENT_TOKEN
			// ) {
			// 	return reply.sendError(APIErrors.PERMISSION_ERROR);
			// }

			// Validate payment method
			const paymentMethod = await prisma.paymentMethod.findFirst({
				where: {
					userId: user.id,
					provider: "AuthorizeNet",
				},
			});

			if (!paymentMethod) {
				return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
			}

			const customerProfile =
				await authorizeNetService.fetchCustomerProfile(
					paymentMethod.token,
				);

			if (customerProfile.getMessages().getResultCode() !== "Ok") {
				return reply.sendError(
					APIErrors.PAYMENT_METHOD_FETCH_FAILED(
						customerProfile.getMessages().getMessage()[0].getText(),
					),
				);
			}

			const customerPaymentProfile =
				customerProfile.profile.paymentProfiles.find(
					(profile: any) =>
						profile.customerPaymentProfileId ===
						request.body.customerPaymentProfileId,
				);

			if (!customerPaymentProfile) {
				return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
			}

			if (!customerProfile) {
				return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
			}

			const creator = await prisma.profile.findFirst({
				where: { id: BigInt(request.body.hostId) },
			});
			if (!creator || creator.userId === BigInt(session.userId)) {
				return reply.sendError(
					APIErrors.INVALID_MEETING_HOST(request.body.hostId),
				);
			}

			// Validate duration
			const durations = await prisma.meetingDuration.findFirst({
				where: {
					creatorId: creator.id,
					length: request.body.duration,
					isEnabled: true,
				},
			});
			if (!durations) {
				return reply.sendError(APIErrors.INVALID_DURATION);
			}

			// Validate start date
			const startTime = DateTime.fromISO(request.body.startDate);
			const fromNowInterval = Interval.fromDateTimes(
				DateTime.now(),
				startTime,
			);
			if (
				!fromNowInterval.isValid ||
				fromNowInterval.length("week") > 4
			) {
				return reply.sendError(APIErrors.INVALID_MEETING_DATE);
			}
			const meetingTimeInterval = Interval.fromDateTimes(
				startTime,
				startTime.plus({ minute: request.body.duration }),
			);
			if (!meetingTimeInterval.isValid) {
				return reply.sendError(APIErrors.INVALID_INTERVAL);
			}

			// Check meeting conflicts
			const existingMeetings = await prisma.meeting.findMany({
				where: {
					hostId: creator.id,
					startDate: { gte: startTime.toJSDate() },
				},
			});
			if (
				existingMeetings.some((existingMeeting) => {
					const existingMeetingInterval = Interval.fromDateTimes(
						DateTime.fromJSDate(existingMeeting.startDate),
						DateTime.fromJSDate(existingMeeting.endDate),
					);
					return existingMeetingInterval.intersection(
						meetingTimeInterval,
					)?.isValid;
				})
			) {
				return reply.sendError(APIErrors.MEETING_CONFLICT);
			}

			// Check if meeting fits into creators time intervals
			const intervals = await prisma.meetingInterval.findMany({
				where: { creatorId: creator.id },
			});
			if (
				!intervals.some((interval) => {
					const intervalStartTime = DateTime.fromJSDate(
						interval.startTime,
					)
						.set({
							year: startTime.year,
							month: startTime.month,
							day: startTime.day,
						})
						.set({
							weekday:
								ModelConverter.weekDay2Index(interval.day) + 1,
						});
					const intervalEndTime = intervalStartTime.plus({
						minute: interval.length,
					});
					const timeInterval = Interval.fromDateTimes(
						intervalStartTime,
						intervalEndTime,
					);

					return (
						timeInterval.contains(
							meetingTimeInterval.start as DateTime,
						) &&
						timeInterval.contains(
							meetingTimeInterval.end as DateTime,
						)
					);
				})
			) {
				return reply.sendError(APIErrors.MEETING_SCHEDULE_MISMATCH);
			}

			// Check vacations
			const vacations = await prisma.meetingVacation.findMany({
				where: { creatorId: creator.id },
			});
			if (
				vacations.some((vacation) => {
					const vacationInterval = Interval.fromDateTimes(
						DateTime.fromJSDate(vacation.startDate),
						DateTime.fromJSDate(vacation.endDate),
					);
					return vacationInterval.intersection(meetingTimeInterval)
						?.isValid;
				})
			) {
				return reply.sendError(APIErrors.MEETING_VACATION_CONFLICT);
			}

			// Calculate fees
			const customerInformation = {
				country: customerPaymentProfile.billTo.country,
				state: customerPaymentProfile.billTo.state,
				city: customerPaymentProfile.billTo.city,
				zip: customerPaymentProfile.billTo.zip,
				address: customerPaymentProfile.billTo.address,
			};

			const amountDinero = dinero({
				amount: durations.price,
			});

			const feesOutput = await feesCalculator.purchaseServiceFees(
				amountDinero.getAmount(),
				customerInformation,
			);

			if (feesOutput instanceof TaxjarError) {
				return reply.sendError(
					APIErrors.PAYMENT_FAILED(feesOutput.detail),
				);
			}

			// Create meeting
			const meeting = await meetingService.create({
				host: creator,
				userId: BigInt(session.userId),
				startDate: meetingTimeInterval.start?.toUTC()?.toJSDate(),
				endDate: meetingTimeInterval.end?.toUTC()?.toJSDate(),
			});

			// Create transaction
			const videoCallPurchase = await prisma.videoCallPurchase.create({
				data: {
					id: snowflake.gen(),
					fanId: user.id,
					creatorId: creator.id,
					meetingId: meeting.id,
					paymentMethodId: paymentMethod.id,
					paymentProfileId:
						customerPaymentProfile.customerPaymentProfileId,

					provider: "AuthorizeNet",
					amount: feesOutput.amount.getAmount(),
					processingFee: 0,
					platformFee: feesOutput.platformFee.getAmount(),
					vatFee: feesOutput.vatFee.getAmount(),
					status: "Initialized",
				},
			});

			const siftTransaction = async (
				status: "$success" | "$failure" | "$pending",
				orderId?: string,
			) => {
				return await siftService.transaction({
					$user_id: user.id.toString(),
					$user_email: user.email,
					$amount: feesOutput.totalAmount.getAmount() * 10000,
					$currency_code: "USD",
					$order_id: orderId,
					$transaction_id: videoCallPurchase.id.toString(),
					$transaction_type: "$sale",
					$transaction_status: status,
					$ip: request.ip,
					$seller_user_id: creator.id.toString(),
					$billing_address: {
						$name:
							customerPaymentProfile.billTo.firstName +
							" " +
							customerPaymentProfile.billTo.lastName,
						$address_1: customerPaymentProfile.billTo.address,
						$city: customerPaymentProfile.billTo.city,
						$region: customerPaymentProfile.billTo.state,
						$country: customerPaymentProfile.billTo.country,
						$zipcode: customerPaymentProfile.billTo.zip,
					},
					$payment_method: {
						$payment_type: "$credit_card",
						$payment_gateway: "$authorizenet",
						$account_holder_name:
							customerPaymentProfile.billTo.firstName +
							" " +
							customerPaymentProfile.billTo.lastName,
						$card_last4:
							customerPaymentProfile.payment.creditCard.cardNumber.slice(
								-4,
							),
						$verification_status: "$success",
					},
					$browser: {
						$user_agent: request.headers["user-agent"] ?? "",
						$accept_language:
							request.headers["accept-language"] ?? "",
					},
				});
			};

			const response = await siftTransaction("$pending");

			const hasBadPaymentAbuseDecision =
				response.score_response.workflow_statuses.some((workflow) =>
					workflow.history.some(
						(historyItem) =>
							historyItem.config.decision_id ===
							"looks_bad_payment_abuse",
					),
				);

			if (hasBadPaymentAbuseDecision) {
				await prisma.videoCallPurchase.update({
					where: { id: videoCallPurchase.id },
					data: {
						status: "Failed",
						error: "Transaction flagged as fraudulent.",
					},
				});

				await siftTransaction("$failure");

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						"Failed because of fraud detection, if you believe this is an error contact support.",
					),
				);
			}

			const paymentResponse =
				await authorizeNetService.authorizeCreditCard({
					customerProfileId:
						customerProfile.profile.customerProfileId,
					customerPaymentProfileId:
						customerPaymentProfile.customerPaymentProfileId,
					description: `Video Call for ${user.username} with ${creator.displayName}`,
					amount: feesOutput.totalAmount.getAmount(),
					merchantData: {
						userId: user.id.toString(),
						transactionId: videoCallPurchase.id.toString(),
					},
				});

			if (paymentResponse.getMessages().getResultCode() !== "Ok") {
				await prisma.videoCallPurchase.update({
					where: { id: videoCallPurchase.id },
					data: {
						status: "Failed",
						error: paymentResponse
							.getMessages()
							.getMessage()[0]
							.getText(),
					},
				});

				await siftTransaction(
					"$failure",
					paymentResponse.transactionResponse.transId,
				);

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						paymentResponse.getMessages().getMessage()[0].getText(),
					),
				);
			}

			await prisma.videoCallPurchase.update({
				where: { id: videoCallPurchase.id },
				data: {
					status: "Submitted",
					transactionId: paymentResponse
						.getTransactionResponse()
						?.getTransId(),
				},
			});

			const POLL_INTERVAL = 1000;
			const MAX_DURATION = 60000;

			const startDateTime = Date.now();

			for await (const _ of setInterval(POLL_INTERVAL)) {
				const videoCallPurchaseStatus =
					await prisma.videoCallPurchase.findUnique({
						where: { id: videoCallPurchase.id },
						select: { status: true },
					});

				if (
					videoCallPurchaseStatus?.status ===
					TransactionStatus.Pending
				) {
					clearInterval(POLL_INTERVAL);
					return reply
						.status(200)
						.send(ModelConverter.toIMeeting(meeting));
				}

				if (Date.now() - startDateTime > MAX_DURATION) {
					clearInterval(POLL_INTERVAL);
					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							"Transaction processing took too long. Please check back later.",
						),
					);
				}
			}
		},
	);

	fastify.post<{
		Params: AcceptMeetingParams;
	}>(
		"/:meetingId/accept",
		{
			schema: {
				params: AcceptMeetingParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
				authorizeNetService.webhookPrehandler,
			],
		},
		async (request, reply) => {
			const session = request.session as Session;
			const profile = await session.getProfile(prisma);

			if (!profile) {
				return reply.sendError(APIErrors.PROFILE_NOT_FOUND);
			}

			const videoCallPurchase = await prisma.videoCallPurchase.findFirst({
				where: {
					creatorId: profile.id,
					status: TransactionStatus.Pending,
				},
				orderBy: { createdAt: "desc" },
				include: {
					fan: true,
					creator: true,
					paymentMethod: true,
				},
			});

			if (
				!videoCallPurchase?.transactionId ||
				!videoCallPurchase.paymentMethod
			) {
				return reply.sendError(APIErrors.TRANSACTION_NOT_FOUND);
			}

			const customerProfile =
				await authorizeNetService.fetchCustomerProfile(
					videoCallPurchase.paymentMethod.token,
				);

			if (customerProfile.getMessages().getResultCode() !== "Ok") {
				return reply.sendError(
					APIErrors.PAYMENT_METHOD_FETCH_FAILED(
						customerProfile.getMessages().getMessage()[0].getText(),
					),
				);
			}

			const customerPaymentProfile =
				customerProfile.profile.paymentProfiles.find(
					(profile: any) =>
						profile.customerPaymentProfileId ===
						videoCallPurchase.paymentProfileId,
				);

			if (!customerPaymentProfile) {
				return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
			}

			if (!customerProfile) {
				return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
			}

			const siftTransaction = async (
				status: "$success" | "$failure" | "$pending",
				orderId?: string,
			) => {
				return await siftService.transaction({
					$user_id: videoCallPurchase.fan.id.toString(),
					$user_email: videoCallPurchase.fan.email,
					$amount: videoCallPurchase.amount * 10000,
					$currency_code: "USD",
					$order_id: orderId,
					$transaction_id: videoCallPurchase.id.toString(),
					$transaction_type: "$sale",
					$transaction_status: status,
					$ip: request.ip,
					$seller_user_id: videoCallPurchase.creator.id.toString(),
					$billing_address: {
						$name:
							customerPaymentProfile.billTo.firstName +
							" " +
							customerPaymentProfile.billTo.lastName,
						$address_1: customerPaymentProfile.billTo.address,
						$city: customerPaymentProfile.billTo.city,
						$region: customerPaymentProfile.billTo.state,
						$country: customerPaymentProfile.billTo.country,
						$zipcode: customerPaymentProfile.billTo.zip,
					},
					$payment_method: {
						$payment_type: "$credit_card",
						$payment_gateway: "$authorizenet",
						$account_holder_name:
							customerPaymentProfile.billTo.firstName +
							" " +
							customerPaymentProfile.billTo.lastName,
						$card_last4:
							customerPaymentProfile.payment.creditCard.cardNumber.slice(
								-4,
							),
						$verification_status: "$success",
					},
					$browser: {
						$user_agent: request.headers["user-agent"] ?? "",
						$accept_language:
							request.headers["accept-language"] ?? "",
					},
				});
			};

			const paymentResponse =
				await authorizeNetService.capturePreviouslyAuthorizedAmount({
					transactionId: videoCallPurchase.transactionId,
					description: `Video Call for ${videoCallPurchase.fan.username} with ${videoCallPurchase.creator.displayName}`,
					amount: videoCallPurchase.amount,
					merchantData: {
						userId: videoCallPurchase.fan.id.toString(),
						transactionId: videoCallPurchase.id.toString(),
					},
				});

			if (paymentResponse.getMessages().getResultCode() !== "Ok") {
				await prisma.videoCallPurchase.update({
					where: { id: videoCallPurchase.id },
					data: {
						status: "Failed",
						error: paymentResponse
							.getMessages()
							.getMessage()[0]
							.getText(),
					},
				});

				await siftTransaction(
					"$failure",
					paymentResponse.transactionResponse.transId,
				);

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						paymentResponse.getMessages().getMessage()[0].getText(),
					),
				);
			}

			const POLL_INTERVAL = 1000;
			const MAX_DURATION = 60000;

			const startDateTime = Date.now();

			for await (const _ of setInterval(POLL_INTERVAL)) {
				const videoCallPurchaseStatus =
					await prisma.videoCallPurchase.findUnique({
						where: { id: videoCallPurchase.id },
						select: { status: true },
					});

				if (
					videoCallPurchaseStatus?.status ===
					TransactionStatus.Successful
				) {
					clearInterval(POLL_INTERVAL);
					return reply.send({
						message: "Video call accepted successfully!",
					});
				}

				if (Date.now() - startDateTime > MAX_DURATION) {
					clearInterval(POLL_INTERVAL);
					return reply.sendError(
						APIErrors.PAYMENT_FAILED(
							"Transaction processing took too long. Please check back later.",
						),
					);
				}
			}
		},
	);

	fastify.get<{
		Querystring: PaginatedQuery<MeetingsQuery>;
		Reply: IMeeting[];
	}>(
		"/",
		{
			schema: {
				querystring: MeetingQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const {
				page = 1,
				size = DEFAULT_PAGE_SIZE,
				hostId,
				before,
				after,
			} = request.query;

			const session = request.session!;
			const meetings = await prisma.meeting.findMany({
				where: {
					...(hostId ? { hostId: BigInt(hostId) } : {}),
					users: {
						some: {
							userId: BigInt(session.userId),
						},
					},
					startDate: {
						lte: before
							? new Date(before)
							: DateTime.utc().plus({ years: 1 }).toJSDate(),
						gte: after
							? new Date(after)
							: DateTime.utc().minus({ years: 1 }).toJSDate(),
					},
				},
				orderBy: { startDate: "asc" },
				take: size,
				skip: (page - 1) * size,
			});

			return reply.send(meetings.map(ModelConverter.toIMeeting));
		},
	);

	fastify.get<{
		Querystring: MeetingsQuery;
		Params: IdParams;
		Reply: IMeeting;
	}>(
		"/:id",
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
			const session = request.session!;

			const meetingUser = await prisma.meetingUser.findFirst({
				where: {
					userId: BigInt(session.userId),
					meetingId: BigInt(request.params.id),
				},
			});
			if (!meetingUser) {
				// only meeting attendants can query meeting
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			const meeting = await meetingService.getById(
				BigInt(request.params.id),
			);
			if (!meeting) {
				return reply.sendError(APIErrors.MEETING_NOT_FOUND);
			}

			return reply.send(ModelConverter.toIMeeting(meeting));
		},
	);

	fastify.get<{
		Querystring: MeetingsQuery;
		Params: IdParams;
		Reply: GetChimeReply;
	}>(
		"/:id/session-configuration",
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
			const session = request.session!;

			const meetingUser = await prisma.meetingUser.findFirst({
				where: {
					userId: BigInt(session.userId),
					meetingId: BigInt(request.params.id),
				},
				include: {
					meeting: true,
				},
			});
			if (!meetingUser) {
				// only meeting attendants can query meeting
				return reply.sendError(APIErrors.PERMISSION_ERROR);
			}

			const meeting = await meetingService.getChimeMeeting(
				meetingUser.meeting,
			);
			const attendee = await meetingService.getChimeAttendee(
				meetingUser.meeting,
				meetingUser,
			);

			return reply.send({
				Meeting: meeting?.Meeting,
				Attendee: attendee?.Attendee,
			});
		},
	);
}
