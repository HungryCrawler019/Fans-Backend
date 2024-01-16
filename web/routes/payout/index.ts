import { EntityType, PayoutMode, TransactionStatus } from "@prisma/client";
import { FastifyPluginOptions } from "fastify";
import { DEFAULT_PAGE_SIZE, isOutOfRange } from "../../../common/pagination.js";
import PayPalService from "../../../common/service/PayPalService.js";
import PrismaService from "../../../common/service/PrismaService.js";
import SessionManagerService from "../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../common/service/SnowflakeService.js";
import { PageQuery } from "../../../common/validators/schemas.js";
import { PageQueryValidator } from "../../../common/validators/validation.js";
import APIErrors from "../../errors/index.js";
import { ModelConverter } from "../../models/modelConverter.js";
import { FastifyTypebox } from "../../types.js";
import {
	DeletePayoutMethodReqBody,
	GetPayoutMethodReqBody,
	PayoutLogsRespBody,
	PayoutMethodReqBody,
	PutPayoutMethodReqBody,
	UpdatePayoutScheduleReqBody,
} from "./schemas.js";
import {
	DeletePayoutMethodReqBodyValidator,
	GetPayoutMethodReqBodyValidator,
	PayoutMethodReqBodyValidator,
	PutPayoutMethodReqBodyValidator,
	UpdatePayoutScheduleReqBodyValidator,
} from "./validation.js";

const DECIMAL_TO_CENT_FACTOR = 100;

export default async function routes(
	fastify: FastifyTypebox,
	options: FastifyPluginOptions,
) {
	const { container } = fastify;

	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);
	const paypalService = await container.resolve(PayPalService);

	fastify.get(
		"/payment-methods",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				const payoutPaymentMethods =
					await prisma.payoutPaymentMethod.findMany({
						where: { profileId: BigInt(profile.id) },
						select: {
							id: true,
							provider: true,
							paypalEmail: true,
							bankInfo: true,
							country: true,
							entityType: true,
							usCitizenOrResident: true,
						},
					});

				if (payoutPaymentMethods && payoutPaymentMethods.length > 0) {
					return reply.send(
						payoutPaymentMethods.map((p) => ({
							...p,
							bankInfo: {
								...p.bankInfo,
								bankAccountNumber:
									"************" +
									p.bankInfo?.bankAccountNumber.slice(-4),
							},
						})),
					);
				} else {
					return reply.sendError(APIErrors.PAYMENT_METHODS_NOT_FOUND);
				}
			} catch (error) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get(
		"/payout-schedule",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				const payoutSchedule = await prisma.payoutSchedule.findFirst({
					where: { profileId: BigInt(profile.id) },
				});

				if (payoutSchedule) {
					const payoutLogs = await prisma.payoutLog.findMany({
						where: {
							profileId: BigInt(profile.id),
							createdAt: {
								gte: new Date(
									new Date().getFullYear(),
									new Date().getMonth() - 1,
								),
							},
							status: {
								notIn: [TransactionStatus.Failed],
							},
						},
					});

					return reply.send({
						...payoutSchedule,
						totalPayoutAmount:
							payoutLogs.reduce(
								(acc, log) => acc + log.amount,
								0,
							) / DECIMAL_TO_CENT_FACTOR,
					});
				} else {
					return reply.sendError(APIErrors.PAYOUT_SCHEDULE_NOT_FOUND);
				}
			} catch (error) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get(
		"/execute-payout",
		{
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				const payoutPaymentMethod =
					await prisma.payoutPaymentMethod.findFirst({
						where: {
							profileId: BigInt(profile.id),
							provider: "Bank",
						},
					});

				if (!payoutPaymentMethod) {
					return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				}

				const balance = await prisma.balance.findFirst({
					where: { profileId: BigInt(profile.id) },
				});

				if (!balance) {
					return reply.sendError(APIErrors.WEBHOOK_BALANCE_NOT_FOUND);
				}

				if (
					balance.amount <
					Number(process.env.MIN_PAYOUT_AMOUNT) *
						DECIMAL_TO_CENT_FACTOR
				) {
					return reply.sendError(
						APIErrors.MIN_PAYOUT_NOT_MET(
							Number(process.env.MIN_PAYOUT_AMOUNT!),
						),
					);
				}

				const payoutLog = await prisma.payoutLog.findFirst({
					where: {
						profileId: BigInt(profile.id),
						status: TransactionStatus.Pending,
					},
				});

				if (payoutLog) {
					return reply.sendError(APIErrors.PENDING_PAYOUT);
				}

				// const fees = await feesCalculator.payoutFees(
				// 	balance.amount,
				// 	"PayPal",
				// 	payoutPaymentMethod.country,
				// );

				await prisma.payoutLog.create({
					data: {
						id: snowflake.gen(),
						profileId: BigInt(profile.id),
						payoutPaymentMethodId: payoutPaymentMethod.id,
						// amount: fees.payoutAmount.getAmount(),
						// processingFee: fees.processingFee.getAmount(),
						amount: balance.amount,
						processingFee: 0,
						status: TransactionStatus.Pending,
					},
				});

				await prisma.balance.update({
					where: { id: balance.id },
					data: {
						amount: 0,
					},
				});

				// const payout = await payoutService.processPayout(
				// 	profile.id,
				// 	true,
				// );

				// if (payout?.pendingPayout) {
				// 	return reply.sendError(APIErrors.PENDING_PAYOUT);
				// } else if (payout?.insufficientBalance) {
				// 	return reply.sendError(
				// 		APIErrors.INSUFFICIENT_BALANCE(
				// 			process.env.MIN_PAYOUT_AMOUNT!,
				// 		),
				// 	);
				// } else if (payout?.noPayoutMethod) {
				// 	return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				// } else if (payout?.maxPayoutAmount) {
				// 	return reply.sendError(
				// 		APIErrors.MAX_PAYOUT_EXCEEDED(payout.maxPayoutAmount),
				// 	);
				// } else if (payout?.minPayoutAmount) {
				// 	return reply.sendError(
				// 		APIErrors.MIN_PAYOUT_NOT_MET(payout.minPayoutAmount),
				// 	);
				// } else if (payout?.minPayoutAmount) {
				// 	return reply.sendError(
				// 		APIErrors.MIN_PAYOUT_NOT_MET(payout.minPayoutAmount),
				// 	);
				// }

				return reply.send({ message: "Payout executed successfully." });
			} catch (error) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get<{ Params: GetPayoutMethodReqBody }>(
		"/payment-method/:id",
		{
			schema: {
				params: GetPayoutMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id } = request.params;

				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				const payoutMethod =
					await prisma.payoutPaymentMethod.findUnique({
						where: {
							id: BigInt(id),
							profileId: BigInt(profile.id),
						},
						select: {
							id: true,
							provider: true,
							paypalEmail: true,
							bankInfo: true,
							country: true,
							entityType: true,
							usCitizenOrResident: true,
						},
					});

				if (!payoutMethod) {
					return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				}

				reply.send(payoutMethod);
			} catch (error) {
				console.log(error);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.post<{ Body: PayoutMethodReqBody }>(
		"/payment-method",
		{
			schema: {
				body: PayoutMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const {
					paypalEmail,
					bankInfo,
					country,
					entityType,
					usCitizenOrResident,
				} = request.body;

				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				// if (
				// 	!profile.ageVerifyId ||
				// 	profile.ageVerifyStatus === "ACCEPTED"
				// ) {
				// 	return reply.sendError(APIErrors.AGE_VERIFICATION_REQUIRED);
				// }

				const newPayoutMethod = await prisma.payoutPaymentMethod.create(
					{
						data: {
							id: snowflake.gen(),
							profileId: BigInt(profile.id),
							provider: paypalEmail ? "PayPal" : "Bank",
							paypalEmail,
							country,
							entityType: entityType as EntityType,
							usCitizenOrResident,
						},
					},
				);

				let bankInfoId;
				if (bankInfo) {
					const createdBankInfo = await prisma.bankInfo.create({
						data: {
							id: snowflake.gen(),
							payoutPaymentMethodId: BigInt(newPayoutMethod.id),
							firstName: bankInfo.firstName,
							lastName: bankInfo.lastName,
							address1: bankInfo.address1,
							address2: bankInfo.address2,
							city: bankInfo.city,
							state: bankInfo.state,
							zip: bankInfo.zip,
							bankRoutingNumber: bankInfo.bankRoutingNumber,
							bankAccountNumber: bankInfo.bankAccountNumber,
						},
					});
					bankInfoId = createdBankInfo.id;
				}

				await prisma.payoutPaymentMethod.update({
					where: { id: BigInt(newPayoutMethod.id) },
					data: { bankInfoId },
				});

				reply.send({
					message: "Successfully added PayPal payout method.",
					payoutMethod: newPayoutMethod,
				});
			} catch (error) {
				console.log(error);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{
		Params: PutPayoutMethodReqBody;
		Body: PayoutMethodReqBody;
	}>(
		"/payment-method/:id",
		{
			schema: {
				params: PutPayoutMethodReqBodyValidator,
				body: PayoutMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				const {
					paypalEmail,
					bankInfo,
					country,
					entityType,
					usCitizenOrResident,
				} = request.body;

				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				// if (
				// 	!profile.ageVerifyId ||
				// 	profile.ageVerifyStatus === "ACCEPTED"
				// ) {
				// 	return reply.sendError(APIErrors.AGE_VERIFICATION_REQUIRED);
				// }

				const payoutMethod =
					await prisma.payoutPaymentMethod.findUnique({
						where: {
							id: BigInt(id),
							profileId: BigInt(profile.id),
						},
					});

				if (!payoutMethod) {
					return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				}

				let bankInfoId;
				if (bankInfo) {
					await prisma.bankInfo.update({
						where: { payoutPaymentMethodId: BigInt(id) },
						data: {
							firstName: bankInfo.firstName,
							lastName: bankInfo.lastName,
							address1: bankInfo.address1,
							address2: bankInfo.address2,
							city: bankInfo.city,
							state: bankInfo.state,
							zip: bankInfo.zip,
							bankRoutingNumber: bankInfo.bankRoutingNumber,
							bankAccountNumber: bankInfo.bankAccountNumber,
						},
					});
				}

				const updatedPayoutMethod =
					await prisma.payoutPaymentMethod.update({
						where: { id: BigInt(id) },
						data: {
							paypalEmail,
							bankInfoId,
							country,
							entityType: entityType as EntityType,
							usCitizenOrResident,
						},
					});

				reply.send({
					message: "Successfully updated PayPal payout method.",
					payoutMethod: updatedPayoutMethod,
				});
			} catch (error) {
				console.log(error);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: DeletePayoutMethodReqBody }>(
		"/payment-method/:id",
		{
			schema: {
				params: DeletePayoutMethodReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id } = request.params;

				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				// if (
				// 	!profile.ageVerifyId ||
				// 	profile.ageVerifyStatus === "ACCEPTED"
				// ) {
				// 	return reply.sendError(APIErrors.AGE_VERIFICATION_REQUIRED);
				// }

				const payoutMethod =
					await prisma.payoutPaymentMethod.findUnique({
						where: {
							id: BigInt(id),
							profileId: BigInt(profile.id),
						},
					});

				if (!payoutMethod) {
					return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				}

				await prisma.payoutPaymentMethod.delete({
					where: { id: BigInt(id) },
				});

				reply.send({
					message: "Successfully deleted PayPal payout method.",
				});
			} catch (error) {
				console.log(error);
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: UpdatePayoutScheduleReqBody }>(
		"/payout-schedule",
		{
			schema: {
				body: UpdatePayoutScheduleReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { mode, threshold } = request.body;

				const session = request.session!;
				const profile = await session.getProfile(prisma);

				if (!profile) {
					return reply.sendError(APIErrors.UNAUTHORIZED);
				}

				// if (
				// 	!profile.ageVerifyId ||
				// 	profile.ageVerifyStatus === "ACCEPTED"
				// ) {
				// 	return reply.sendError(APIErrors.AGE_VERIFICATION_REQUIRED);
				// }

				const existingPayoutSchedule =
					await prisma.payoutSchedule.findFirst({
						where: { profileId: BigInt(profile.id) },
					});

				if (existingPayoutSchedule) {
					const updatedPayoutSchedule =
						await prisma.payoutSchedule.update({
							where: { id: existingPayoutSchedule.id },
							data: { mode: mode as PayoutMode, threshold },
						});
					return reply.send({
						message: "Successfully updated payout schedule.",
						payoutSchedule: updatedPayoutSchedule,
					});
				} else {
					return reply.sendError(APIErrors.PAYOUT_SCHEDULE_NOT_FOUND);
				}
			} catch (error) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	interface PaypalWebhookEvent {
		id: string;
		event_type: string;
		resource: {
			id: string;
			supplementary_data: {
				related_ids: {
					order_id: string;
				};
			};
			batch_header: {
				sender_batch_header: {
					sender_batch_id: string;
				};
			};
		};
	}

	fastify.post("/webhook/paypal", async (request, reply) => {
		if (!request.body) {
			return reply.sendError(APIErrors.WEBHOOK_PAYLOAD_MISSING);
		}

		console.log(JSON.stringify(request.body), "event");

		const webhookId = process.env.PAYPAL_WEBHOOK_PAYOUT_ID as string;
		const transmissionId = request.headers[
			"paypal-transmission-id"
		] as string;
		const certUrl = request.headers["paypal-cert-url"] as string;
		const authAlgo = request.headers["paypal-auth-algo"] as string;
		const transmissionSig = request.headers[
			"paypal-transmission-sig"
		] as string;
		const transmissionTime = request.headers[
			"paypal-transmission-time"
		] as string;

		const webhookEventVerifyResponse =
			await paypalService.verifyWebhookEvent({
				auth_algo: authAlgo,
				cert_url: certUrl,
				transmission_id: transmissionId,
				transmission_sig: transmissionSig,
				transmission_time: transmissionTime,
				webhook_id: webhookId,
				webhook_event: request.body,
			});

		if (webhookEventVerifyResponse.data.verification_status !== "SUCCESS") {
			return reply.sendError(APIErrors.WEBHOOK_PAYLOAD_INVALID);
		}

		const event = request.body as PaypalWebhookEvent;

		const processedEvent = await prisma.processedWebhookEvent.findUnique({
			where: { id: event.id },
		});

		if (processedEvent) {
			return reply.send({ success: true });
		}

		const event_type = event.event_type;
		const sender_batch_id =
			event.resource.batch_header.sender_batch_header.sender_batch_id;

		try {
			const payoutLog = await prisma.payoutLog.findUnique({
				where: { id: BigInt(sender_batch_id) },
			});

			if (!payoutLog) {
				return reply.sendError(APIErrors.WEBHOOK_PAYLOAD_INVALID);
			}

			let transactionStatus;
			switch (event_type) {
				case "PAYMENT.PAYOUTSBATCH.SUCCESS":
					transactionStatus = TransactionStatus.Successful;
					break;
				case "PAYMENT.PAYOUTSBATCH.DENIED":
					transactionStatus = TransactionStatus.Failed;
					break;
				case "PAYMENT.PAYOUTSBATCH.PROCESSING":
					transactionStatus = TransactionStatus.Pending;
					break;
			}

			if (transactionStatus) {
				const payoutLog = await prisma.payoutLog.findUnique({
					where: { id: BigInt(sender_batch_id) },
				});

				if (payoutLog) {
					if (
						payoutLog.status !== TransactionStatus.Successful ||
						(transactionStatus !== TransactionStatus.Pending &&
							payoutLog.status === TransactionStatus.Successful)
					) {
						await prisma.payoutLog.update({
							where: { id: BigInt(sender_batch_id) },
							data: { status: transactionStatus },
						});
					}
				}
			}

			await prisma.processedWebhookEvent.create({
				data: { id: event.id },
			});

			return reply.send({ success: true });
		} catch (err) {
			return reply.sendError(APIErrors.GENERIC_ERROR);
		}
	});

	fastify.get<{ Querystring: PageQuery }>(
		"/logs",
		{
			schema: {
				querystring: PageQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const { page = 1, size = DEFAULT_PAGE_SIZE } = request.query;
			const total = await prisma.payoutLog.count({
				where: { profileId: profile.id },
				orderBy: { createdAt: "desc" },
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const rows = await prisma.payoutLog.findMany({
				where: { profileId: profile.id },
				orderBy: { createdAt: "desc" },
				take: size,
				skip: (page - 1) * size,
			});

			const result: PayoutLogsRespBody = {
				payoutLogs: rows.map((log) => ModelConverter.toIPayoutLog(log)),
				page,
				size,
				total,
			};
			return reply.send(result);
		},
	);
}
