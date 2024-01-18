import dinero from "dinero.js";
import APIErrors from "../../../errors/index.js";
import PrismaService from "../../../../common/service/PrismaService.js";
import SessionManagerService from "../../../../common/service/SessionManagerService.js";
import SnowflakeService from "../../../../common/service/SnowflakeService.js";
import AuthorizeNetService from "../../../../common/service/AuthorizeNetService.js";
import FeesCalculator from "../../../../common/service/FeesCalculatorService.js";
import SiftService from "../../../../common/service/SiftService.js";
import { IdParams } from "../../../../common/validators/schemas.js";
import { IdParamsValidator } from "../../../../common/validators/validation.js";
import { ModelConverter } from "../../../models/modelConverter.js";
import { FastifyTypebox } from "../../../types.js";
import { setInterval } from "node:timers/promises";
import { TransactionStatus } from "@prisma/client";
import {
	PaidPostRespBody,
	PaidPostUpdateReqBody,
	PurchasePaidPostReqBody,
	PaidPostPriceReqQuery,
	PaidPostQuery,
} from "./schemas.js";
import {
	PaidPostUpdateReqBodyValidator,
	PurchasePaidPostReqBodyValidator,
	PaidPostPriceReqQueryValidator,
	PaidPostQueryValidator,
} from "./validation.js";
import { PostRespBody, PostsRespBody } from "../schemas.js";
import { isOutOfRange } from "../../../../common/pagination.js";
import { resolveURLsPostLike } from "../../../utils/UploadUtils.js";
import CloudflareStreamService from "../../../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../../../common/service/MediaUploadService.js";
import { TaxjarError } from "taxjar/dist/util/types.js";

const DECIMAL_TO_CENT_FACTOR = 100;

export default async function routes(fastify: FastifyTypebox) {
	const { container } = fastify;
	const prisma = await container.resolve(PrismaService);
	const sessionManager = await container.resolve(SessionManagerService);
	const snowflake = await container.resolve(SnowflakeService);
	const authorizeNetService = await container.resolve(AuthorizeNetService);
	const feesCalculator = await container.resolve(FeesCalculator);
	const siftService = await container.resolve(SiftService);
	const cloudflareStream = await container.resolve(CloudflareStreamService);
	const mediaUpload = await container.resolve(MediaUploadService);

	fastify.get<{ Params: IdParams }>(
		"/:id",
		{ schema: { params: IdParamsValidator } },
		async (request, reply) => {
			try {
				const { id } = request.params;
				const row = await prisma.paidPost.findFirst({
					where: { id: BigInt(id) },
					include: { thumbMedia: true },
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("PaidPost"),
					);
				const result: PaidPostRespBody =
					ModelConverter.toIPaidPost(row);
				return reply.send(result);
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.put<{ Body: PaidPostUpdateReqBody; Params: IdParams }>(
		"/:id",
		{
			schema: {
				body: PaidPostUpdateReqBodyValidator,
				params: IdParamsValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				const data = request.body;
				const row = await prisma.paidPost.findFirst({
					where: { id: BigInt(id) },
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("PaidPost"),
					);
				await prisma.paidPost.update({
					where: { id: BigInt(id) },
					data,
				});
				return reply
					.status(202)
					.send({ message: "Paid post is updated!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/:id",
		{ schema: { params: IdParamsValidator } },
		async (request, reply) => {
			try {
				const { id } = request.params;
				const row = await prisma.paidPost.findFirst({
					where: { id: BigInt(id) },
				});
				if (!row)
					return reply.sendError(
						APIErrors.ITEM_NOT_FOUND("PaidPost"),
					);
				await prisma.paidPost.delete({
					where: { id: BigInt(id) },
				});
				return reply
					.status(202)
					.send({ message: "Paid post is deleted!" });
			} catch (err) {
				return reply.sendError(APIErrors.GENERIC_ERROR);
			}
		},
	);

	fastify.get<{ Querystring: PaidPostPriceReqQuery }>(
		"/price",
		{
			schema: {
				querystring: PaidPostPriceReqQueryValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const session = request.session!;
			const user = await session.getUser(prisma);

			const { id, customerPaymentProfileId } = request.query;

			let customerInformation;

			if (customerPaymentProfileId) {
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
							customerProfile
								.getMessages()
								.getMessage()[0]
								.getText(),
						),
					);
				}

				const customerPaymentProfile =
					customerProfile.profile.paymentProfiles.find(
						(profile: any) =>
							profile.customerPaymentProfileId ===
							customerPaymentProfileId,
					);

				if (!customerPaymentProfile) {
					return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
				}

				if (!customerProfile) {
					return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
				}

				customerInformation = {
					country: customerPaymentProfile.billTo.country,
					state: customerPaymentProfile.billTo.state,
					city: customerPaymentProfile.billTo.city,
					zip: customerPaymentProfile.billTo.zip,
					address: customerPaymentProfile.billTo.address,
				};
			}

			const post = await prisma.post.findFirst({
				where: { id: BigInt(id) },
				select: { id: true, profileId: true },
			});

			if (!post) {
				return reply.sendError(APIErrors.POST_NOT_FOUND);
			}

			const paidPost = await prisma.paidPost.findFirst({
				where: { postId: BigInt(id) },
			});

			if (!paidPost) {
				return reply.sendError(APIErrors.POST_NOT_FOUND);
			}

			const amountDinero = dinero({
				amount: Math.round(paidPost.price * DECIMAL_TO_CENT_FACTOR),
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

			reply.send({
				amount: feesOutput.amount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				platformFee:
					feesOutput.platformFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
				vatFee: feesOutput.vatFee.getAmount() / DECIMAL_TO_CENT_FACTOR,
				totalAmount:
					feesOutput.totalAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
			});
		},
	);

	fastify.post<{ Body: PurchasePaidPostReqBody }>(
		"/purchase",
		{
			schema: {
				body: PurchasePaidPostReqBodyValidator,
			},
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				authorizeNetService.webhookPrehandler,
			],
		},
		async (request, reply) => {
			const { postId, customerPaymentProfileId, fanReferralCode } =
				request.body;

			const session = request.session!;
			const user = await session.getUser(prisma);
			const profile = await session.getProfile(prisma);

			const post = await prisma.post.findFirst({
				where: { id: BigInt(postId) },
				select: { id: true, profileId: true },
			});

			if (!post) {
				return reply.sendError(APIErrors.POST_NOT_FOUND);
			}

			const paidPost = await prisma.paidPost.findFirst({
				where: { postId: BigInt(postId) },
			});

			if (!paidPost) {
				return reply.sendError(APIErrors.POST_NOT_FOUND);
			}

			if (post.profileId === profile?.id) {
				return reply.sendError(APIErrors.PURCHASE_POST_SELF);
			}

			const alreadyPurchased = await prisma.paidPostTransaction.findFirst(
				{
					where: {
						userId: user.id,
						paidPostId: paidPost.id,
						OR: [
							{
								status: TransactionStatus.Successful,
							},
							{
								AND: [
									{
										status: {
											in: [
												TransactionStatus.Initialized,
												TransactionStatus.Submitted,
											],
										},
									},
									{
										createdAt: {
											gte: new Date(
												Date.now() - 5 * 60 * 1000,
											).toISOString(),
										},
									},
								],
							},
						],
					},
				},
			);

			if (alreadyPurchased) {
				return reply.sendError(APIErrors.POST_ALREADY_PURCHASED);
			}

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
						customerPaymentProfileId,
				);

			if (!customerPaymentProfile) {
				return reply.sendError(APIErrors.PAYMENT_METHOD_NOT_FOUND);
			}

			if (!customerProfile) {
				return reply.sendError(APIErrors.NO_PAYMENT_METHOD_FOUND);
			}

			const customerInformation = {
				country: customerPaymentProfile.billTo.country,
				state: customerPaymentProfile.billTo.state,
				city: customerPaymentProfile.billTo.city,
				zip: customerPaymentProfile.billTo.zip,
				address: customerPaymentProfile.billTo.address,
			};

			const amountDinero = dinero({
				amount: Math.round(paidPost.price * DECIMAL_TO_CENT_FACTOR),
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

			const paidPostTransaction = await prisma.paidPostTransaction.create(
				{
					data: {
						id: snowflake.gen(),
						userId: user.id,
						creatorId: post.profileId,
						paidPostId: paidPost.id,
						paymentMethodId: paymentMethod.id,
						paymentProfileId:
							customerPaymentProfile.customerPaymentProfileId,

						provider: "AuthorizeNet",
						amount: feesOutput.amount.getAmount(),
						processingFee: 0,
						platformFee: feesOutput.platformFee.getAmount(),
						vatFee: feesOutput.vatFee.getAmount(),
						status: "Initialized",
						fanReferralCode: fanReferralCode,
					},
				},
			);

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
					$transaction_id: paidPostTransaction.id.toString(),
					$transaction_type: "$sale",
					$transaction_status: status,
					$ip: request.ip,
					$seller_user_id: post.profileId.toString(),
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
				await prisma.paidPostTransaction.update({
					where: { id: paidPostTransaction.id },
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
				await authorizeNetService.createPaymentTransaction({
					customerProfileId: paymentMethod.token,
					customerPaymentProfileId:
						customerPaymentProfile.customerPaymentProfileId,
					description: `Paid Post: ${post.id}`,
					amount:
						feesOutput.totalAmount.getAmount() /
						DECIMAL_TO_CENT_FACTOR,
					merchantData: {
						userId: user.id.toString(),
						transactionId: paidPostTransaction.id.toString(),
					},
				});

			if (paymentResponse.getMessages().getResultCode() !== "Ok") {
				await prisma.paidPostTransaction.update({
					where: { id: paidPostTransaction.id },
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

			if (paymentResponse.getTransactionResponse().getErrors()) {
				await prisma.paidPostTransaction.update({
					where: { id: paidPostTransaction.id },
					data: {
						status: "Failed",
						error: paymentResponse
							.getTransactionResponse()
							.getErrors()
							.getError()[0]
							.getErrorText(),
					},
				});

				await siftTransaction(
					"$failure",
					paymentResponse.transactionResponse.transId,
				);

				return reply.sendError(
					APIErrors.PAYMENT_FAILED(
						paymentResponse
							.getTransactionResponse()
							.getErrors()
							.getError()[0]
							.getErrorText(),
					),
				);
			}

			await prisma.paidPostTransaction.update({
				where: { id: paidPostTransaction.id },
				data: {
					status: "Submitted",
					transactionId: paymentResponse
						.getTransactionResponse()
						?.getTransId(),
				},
			});

			const POLL_INTERVAL = 1000;
			const MAX_DURATION = 45000;

			const startTime = Date.now();

			for await (const _ of setInterval(POLL_INTERVAL)) {
				const paidPostTransactionStatus =
					await prisma.paidPostTransaction.findUnique({
						where: { id: paidPostTransaction.id },
						select: { status: true },
					});

				if (
					paidPostTransactionStatus?.status ===
					TransactionStatus.Successful
				) {
					clearInterval(POLL_INTERVAL);
					return reply.send({
						message: "Post purchased successfully!",
					});
				}

				if (Date.now() - startTime > MAX_DURATION) {
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

	// pagination for shop tab in profile feed
	fastify.get<{ Querystring: PaidPostQuery; Reply: PostsRespBody }>(
		"/",
		{
			schema: { querystring: PaidPostQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
				sessionManager.requireProfileHandler,
			],
		},
		async (request, reply) => {
			const { sort = "Latest", page = 1, size = 6 } = request.query;
			const session = request.session!;
			const profile = (await session.getProfile(prisma))!;
			const total = await prisma.paidPost.count({
				where: {
					post: { profileId: profile.id, isPosted: true },
				},
				orderBy:
					sort === "Latest"
						? [
								{ isPinned: "desc" },
								{ post: { updatedAt: "desc" } },
						  ]
						: [
								{ isPinned: "desc" },
								{ post: { updatedAt: "asc" } },
						  ],
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const [rows, metadata] = await Promise.all([
				prisma.paidPost.findMany({
					where: {
						post: { profileId: profile.id, isPosted: true },
					},
					orderBy:
						sort === "Latest"
							? [
									{ isPinned: "desc" },
									{ post: { updatedAt: "desc" } },
							  ]
							: [
									{ isPinned: "desc" },
									{ post: { updatedAt: "asc" } },
							  ],
					include: {
						thumbMedia: true,
						post: {
							include: {
								thumbMedia: true,
								postMedias: {
									include: { upload: true },
								},
								paidPost: {
									include: { thumbMedia: true },
								},
								fundraiser: {
									include: { thumbMedia: true },
								},
								giveaway: {
									include: {
										thumbMedia: true,
										roles: { include: { role: true } },
									},
								},
								poll: {
									include: {
										thumbMedia: true,
										roles: { include: { role: true } },
										pollAnswers: {
											include: {
												_count: {
													select: { pollVotes: true },
												},
											},
										},
									},
								},
								roles: {
									include: { role: true },
								},
								profile: {
									include: {
										stories: {
											where: {
												profileId: profile.id,
												updatedAt: { gt: oneDayBefore },
											},
											include: {
												storyMedias: {
													include: { upload: true },
												},
												_count: {
													select: {
														storyComments: true,
														storyLikes: true,
													},
												},
											},
											orderBy: { updatedAt: "asc" },
										},
									},
								},
								categories: {
									include: {
										category: true,
									},
								},
								_count: {
									select: {
										bookmarks: true,
										postLikes: true,
										comments: true,
									},
								},
							},
						},
					},
					take: size,
					skip: (page - 1) * size,
				}),
				prisma.paidPost.findMany({
					where: {
						post: { profileId: profile.id, isPosted: true },
					},
					orderBy:
						sort === "Latest"
							? [
									{ isPinned: "desc" },
									{ post: { updatedAt: "desc" } },
							  ]
							: [
									{ isPinned: "desc" },
									{ post: { updatedAt: "asc" } },
							  ],
					include: {
						post: {
							include: {
								postMedias: {
									include: {
										upload: true,
									},
								},
								_count: {
									select: {
										bookmarks: {
											where: {
												userId: BigInt(session.userId),
											},
										},
										postLikes: {
											where: {
												userId: BigInt(session.userId),
											},
										},
										comments: {
											where: {
												userId: BigInt(session.userId),
											},
										},
									},
								},
								paidPost: {
									where: {
										PaidPostTransaction: {
											some: {
												userId: BigInt(session.userId),
												status: TransactionStatus.Successful,
											},
										},
									},
									include: {
										PaidPostTransaction: {
											where: {
												userId: BigInt(session.userId),
												status: TransactionStatus.Successful,
											},
										},
									},
								},
							},
						},
					},

					take: size,
					skip: (page - 1) * size,
				}),
			]);

			await Promise.all(
				rows.map((p) =>
					resolveURLsPostLike(p.post, cloudflareStream, mediaUpload),
				),
			);

			const result: PostsRespBody = {
				posts: rows.map((row) => ({
					...ModelConverter.toIPost(row.post, {
						isBookmarked: metadata.find(
							(m) => m.postId === row.postId,
						)
							? metadata.find((m) => m.postId === row.postId)!
									.post._count.bookmarks > 0
							: false,
						isCommented: metadata.find(
							(m) => m.postId === row.postId,
						)
							? metadata.find((m) => m.postId === row.postId)!
									.post._count.comments > 0
							: false,
						isLiked: metadata.find((m) => m.postId === row.postId)
							? metadata.find((m) => m.postId === row.postId)!
									.post._count.postLikes > 0
							: false,
						isPaidOut: false,
						isSelf: true,
						isExclusive: row.post.roles.length > 0,
					}),
					paidPost: ModelConverter.toIPaidPost(row),
					profile: ModelConverter.toIProfile(row.post.profile),
					categories: row.post.categories.map((c) =>
						ModelConverter.toICategory(c.category),
					),
					fundraiser: row.post.fundraiser
						? ModelConverter.toIFundraiser(row.post.fundraiser)
						: undefined,
					giveaway: row.post.giveaway
						? {
								...ModelConverter.toIGiveaway(
									row.post.giveaway,
								),
								roles: row.post.giveaway.roles.map((role) =>
									ModelConverter.toIRole(role.role),
								),
						  }
						: undefined,
					poll: row.post.poll
						? {
								...ModelConverter.toIPoll(row.post.poll),
								roles: row.post.poll.roles.map((r) =>
									ModelConverter.toIRole(r.role),
								),
						  }
						: undefined,
					roles: row.post.roles.map((r) =>
						ModelConverter.toIRole(r.role),
					),
				})),
				page,
				size,
				total,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);

	fastify.post<{ Params: IdParams }>(
		"/pin/:id",
		{
			schema: {
				params: IdParamsValidator,
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
			const { id: postId } = request.params;
			const post = await prisma.post.findUnique({
				where: { id: BigInt(postId), profileId: profile.id },
				include: { paidPost: true },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}
			if (!post.paidPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Paid Post"));
			}

			const updatedPaidPost = await prisma.paidPost.update({
				where: { id: BigInt(post.paidPost.id) },
				data: { isPinned: true },
				include: {
					thumbMedia: true,
					post: {
						include: {
							thumbMedia: true,
							postMedias: {
								include: { upload: true },
							},
						},
					},
				},
			});

			if (!updatedPaidPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Paid Post"));
			}

			await resolveURLsPostLike(
				updatedPaidPost.post,
				cloudflareStream,
				mediaUpload,
			);

			const result: PostRespBody = {
				...ModelConverter.toIPost(updatedPaidPost.post),
				paidPost: ModelConverter.toIPaidPost(updatedPaidPost),
			};
			return reply.status(200).send(result);
		},
	);

	fastify.delete<{ Params: IdParams }>(
		"/pin/:id",
		{
			schema: {
				params: IdParamsValidator,
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
			const { id: postId } = request.params;
			const post = await prisma.post.findUnique({
				where: { id: BigInt(postId), profileId: profile.id },
				include: { paidPost: true },
			});
			if (!post) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Post"));
			}
			if (!post.paidPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Paid Post"));
			}

			const updatedPaidPost = await prisma.paidPost.update({
				where: { id: BigInt(post.paidPost.id) },
				data: { isPinned: false },
				include: {
					thumbMedia: true,
					post: {
						include: {
							thumbMedia: true,
							postMedias: {
								include: { upload: true },
							},
						},
					},
				},
			});

			if (!updatedPaidPost) {
				return reply.sendError(APIErrors.ITEM_NOT_FOUND("Paid Post"));
			}

			await resolveURLsPostLike(
				updatedPaidPost.post,
				cloudflareStream,
				mediaUpload,
			);

			const result: PostRespBody = {
				...ModelConverter.toIPost(updatedPaidPost.post),
				paidPost: ModelConverter.toIPaidPost(updatedPaidPost),
			};
			return reply.status(200).send(result);
		},
	);

	// pagination for purchased tab in user setting
	fastify.get<{ Querystring: PaidPostQuery; Reply: PostsRespBody }>(
		"/purchased",
		{
			schema: { querystring: PaidPostQueryValidator },
			preHandler: [
				sessionManager.sessionPreHandler,
				sessionManager.requireAuthHandler,
			],
		},
		async (request, reply) => {
			const { sort = "Latest", page = 1, size = 6 } = request.query;
			const session = request.session!;
			const total = await prisma.paidPost.count({
				where: {
					PaidPostTransaction: {
						some: {
							userId: BigInt(session.userId),
							status: "Successful",
						},
					},
				},
				orderBy:
					sort === "Latest"
						? [
								{ isPinned: "desc" },
								{ post: { updatedAt: "desc" } },
						  ]
						: [
								{ isPinned: "desc" },
								{ post: { updatedAt: "asc" } },
						  ],
			});

			if (isOutOfRange(page, size, total)) {
				return reply.sendError(APIErrors.OUT_OF_RANGE);
			}

			const currentDate = new Date();
			const oneDayBefore = new Date(
				currentDate.getTime() - 24 * 60 * 60 * 1000,
			);

			const [rows, metadata] = await Promise.all([
				prisma.paidPost.findMany({
					where: {
						PaidPostTransaction: {
							some: {
								userId: BigInt(session.userId),
								status: "Successful",
							},
						},
					},
					orderBy:
						sort === "Latest"
							? [
									{ isPinned: "desc" },
									{ post: { updatedAt: "desc" } },
							  ]
							: [
									{ isPinned: "desc" },
									{ post: { updatedAt: "asc" } },
							  ],
					include: {
						thumbMedia: true,
						post: {
							include: {
								thumbMedia: true,
								postMedias: {
									include: { upload: true },
								},
								paidPost: {
									include: { thumbMedia: true },
								},
								fundraiser: {
									include: { thumbMedia: true },
								},
								giveaway: {
									include: {
										thumbMedia: true,
										roles: { include: { role: true } },
									},
								},
								poll: {
									include: {
										thumbMedia: true,
										roles: { include: { role: true } },
										pollAnswers: {
											include: {
												_count: {
													select: {
														pollVotes: true,
													},
												},
											},
										},
									},
								},
								roles: {
									include: { role: true },
								},
								profile: {
									include: {
										stories: {
											where: {
												updatedAt: { gt: oneDayBefore },
											},
											include: {
												storyMedias: {
													include: { upload: true },
												},
												_count: {
													select: {
														storyComments: true,
														storyLikes: true,
													},
												},
											},
											orderBy: { updatedAt: "asc" },
										},
									},
								},
								categories: {
									include: {
										category: true,
									},
								},
								_count: {
									select: {
										bookmarks: true,
										postLikes: true,
										comments: true,
									},
								},
							},
						},
					},
					take: size,
					skip: (page - 1) * size,
				}),
				prisma.paidPost.findMany({
					where: {
						PaidPostTransaction: {
							some: {
								userId: BigInt(session.userId),
								status: "Successful",
							},
						},
					},
					orderBy:
						sort === "Latest"
							? [
									{ isPinned: "desc" },
									{ post: { updatedAt: "desc" } },
							  ]
							: [
									{ isPinned: "desc" },
									{ post: { updatedAt: "asc" } },
							  ],
					include: {
						post: {
							include: {
								postMedias: {
									include: {
										upload: true,
									},
								},
								_count: {
									select: {
										bookmarks: {
											where: {
												userId: BigInt(session.userId),
											},
										},
										postLikes: {
											where: {
												userId: BigInt(session.userId),
											},
										},
										comments: {
											where: {
												userId: BigInt(session.userId),
											},
										},
									},
								},
								paidPost: {
									where: {
										PaidPostTransaction: {
											some: {
												userId: BigInt(session.userId),
												status: TransactionStatus.Successful,
											},
										},
									},
									include: {
										PaidPostTransaction: {
											where: {
												userId: BigInt(session.userId),
												status: TransactionStatus.Successful,
											},
										},
									},
								},
							},
						},
					},

					take: size,
					skip: (page - 1) * size,
				}),
			]);

			await Promise.all(
				rows.map((p) =>
					resolveURLsPostLike(p.post, cloudflareStream, mediaUpload),
				),
			);

			const result: PostsRespBody = {
				posts: rows.map((row) => ({
					...ModelConverter.toIPost(row.post, {
						isBookmarked: metadata.find(
							(m) => m.postId === row.postId,
						)
							? metadata.find((m) => m.postId === row.postId)!
									.post._count.bookmarks > 0
							: false,
						isCommented: metadata.find(
							(m) => m.postId === row.postId,
						)
							? metadata.find((m) => m.postId === row.postId)!
									.post._count.comments > 0
							: false,
						isLiked: metadata.find((m) => m.postId === row.postId)
							? metadata.find((m) => m.postId === row.postId)!
									.post._count.postLikes > 0
							: false,
						isPaidOut: true,
						isSelf: false,
						isExclusive: row.post.roles.length > 0,
					}),
					paidPost: ModelConverter.toIPaidPost(row),
					profile: ModelConverter.toIProfile(row.post.profile),
					categories: row.post.categories.map((c) =>
						ModelConverter.toICategory(c.category),
					),
					fundraiser: row.post.fundraiser
						? ModelConverter.toIFundraiser(row.post.fundraiser)
						: undefined,
					giveaway: row.post.giveaway
						? {
								...ModelConverter.toIGiveaway(
									row.post.giveaway,
								),
								roles: row.post.giveaway.roles.map((role) =>
									ModelConverter.toIRole(role.role),
								),
						  }
						: undefined,
					poll: row.post.poll
						? {
								...ModelConverter.toIPoll(row.post.poll),
								roles: row.post.poll.roles.map((r) =>
									ModelConverter.toIRole(r.role),
								),
						  }
						: undefined,
					roles: row.post.roles.map((r) =>
						ModelConverter.toIRole(r.role),
					),
				})),
				page,
				size,
				total,
				hasAccess: true,
			};
			return reply.send(result);
		},
	);
}
