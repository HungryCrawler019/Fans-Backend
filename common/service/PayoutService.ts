import {
	PaymentProvider,
	PayoutMode,
	PayoutPaymentMethod,
	PayoutSchedule,
	TransactionStatus,
} from "@prisma/client";
import { Injectable, Injector } from "async-injection";
import dinero, { Dinero } from "dinero.js";
import FeesCalculator from "./FeesCalculatorService.js";
import PayPalService from "./PayPalService.js";
import PrismaService from "./PrismaService.js";
import SnowflakeService from "./SnowflakeService.js";

const DECIMAL_TO_CENT_FACTOR = 100;

type ProcessPayoutResponse =
	| {
			pendingPayout?: boolean;
			insufficientBalance?: boolean;
			noPayoutMethod?: boolean;
			maxPayoutAmount?: number;
			minPayoutAmount?: number;
	  }
	| undefined;

@Injectable()
class PayoutService {
	private readonly minPayoutAmount: Dinero;

	constructor(
		private prisma: PrismaService,
		private snowflake: SnowflakeService,
		private paypalService: PayPalService,
		private feesCalculator: FeesCalculator,
		minPayoutAmount: number,
	) {
		this.minPayoutAmount = dinero({
			amount: minPayoutAmount * DECIMAL_TO_CENT_FACTOR,
		});
	}

	private async hasPendingPayout(profileId: bigint): Promise<boolean> {
		const pendingPayout = await this.prisma.payoutLog.findFirst({
			where: {
				profileId,
				status: {
					in: [
						TransactionStatus.Initialized,
						TransactionStatus.Submitted,
						TransactionStatus.Pending,
					],
				},
			},
		});
		return !!pendingPayout;
	}

	private hasSufficientBalance(balance: Dinero, threshold: Dinero): boolean {
		return balance.greaterThanOrEqual(threshold);
	}

	private shouldProcessPayout(
		payoutSchedule: PayoutSchedule,
		balance: Dinero,
		bypassThreshold: boolean,
	): boolean {
		const isBypassingThreshold = bypassThreshold;
		const isAutomaticPayout = payoutSchedule.mode === PayoutMode.Automatic;
		const thresholdAmount =
			payoutSchedule.threshold! * DECIMAL_TO_CENT_FACTOR;
		const hasSufficientFunds = this.hasSufficientBalance(
			balance,
			dinero({ amount: thresholdAmount }),
		);
		const isAboveMinPayout = balance.greaterThanOrEqual(
			this.minPayoutAmount,
		);

		const shouldProcessPayout =
			(isBypassingThreshold ||
				(isAutomaticPayout && hasSufficientFunds)) &&
			isAboveMinPayout;

		return shouldProcessPayout;
	}

	private async sendPayout(
		payoutLogId: bigint,
		profileId: bigint,
		payoutPaymentMethod: PayoutPaymentMethod,
		payoutAmount: number,
	) {
		const payoutData = {
			sender_batch_header: {
				sender_batch_id: payoutLogId.toString(),
				recipient_type: "EMAIL",
				email_subject: "You have a payout!",
				email_message: `You have received a payout of $${payoutAmount}.`,
			},
			items: [
				{
					amount: {
						value: payoutAmount.toString(),
						currency: "USD",
					},
					sender_item_id: profileId.toString(),
					recipient_wallet: "PAYPAL",
					receiver: payoutPaymentMethod.paypalEmail!,
				},
			],
		};
		return this.paypalService.sendPayout(payoutData);
	}

	private async createPayoutLog(
		profileId: bigint,
		payoutAmount: Dinero,
		processingFee: Dinero,
		payoutPaymentMethodId: bigint,
	) {
		const payoutLogId = this.snowflake.gen();

		await this.prisma.payoutLog.create({
			data: {
				id: payoutLogId,
				profileId,
				payoutPaymentMethodId,
				amount: payoutAmount.getAmount(),
				processingFee: processingFee.getAmount(),
				status: TransactionStatus.Initialized,
			},
		});

		return payoutLogId;
	}

	async processPayout(
		profileId: bigint,
		bypassThreshold: boolean = false,
	): Promise<ProcessPayoutResponse> {
		if (await this.hasPendingPayout(profileId))
			return { pendingPayout: true };

		const [payoutSchedule, payoutPaymentMethod, balanceRecord, payoutLogs] =
			await Promise.all([
				this.prisma.payoutSchedule.findFirst({ where: { profileId } }),
				this.prisma.payoutPaymentMethod.findFirst({
					where: { profileId, provider: PaymentProvider.PayPal },
				}),
				this.prisma.balance.findFirst({ where: { profileId } }),
				this.prisma.payoutLog.findMany({
					where: {
						profileId,
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
				}),
			]);

		if (!payoutSchedule) return { noPayoutMethod: true };
		if (!payoutPaymentMethod) return { noPayoutMethod: true };
		if (!balanceRecord) return { insufficientBalance: true };

		const totalPayoutAmount = dinero({
			amount: payoutLogs.reduce((acc, log) => acc + log.amount, 0),
		});

		const balanceAmount = dinero({ amount: balanceRecord.amount });
		const maxPayoutAmount = dinero({
			// Math.round(amount: payoutSchedule.maxPayout * DECIMAL_TO_CENT_FACTOR),
		});

		const remainingPayout = maxPayoutAmount.subtract(totalPayoutAmount);

		const actualPayoutAmount = dinero.minimum([
			balanceAmount,
			remainingPayout,
		]);

		if (!this.hasSufficientBalance(balanceAmount, this.minPayoutAmount)) {
			return { insufficientBalance: true };
		}

		if (totalPayoutAmount.equalsTo(maxPayoutAmount)) {
			// return { maxPayoutAmount: payoutSchedule.maxPayout };
		}

		const isAboveMinPayout = actualPayoutAmount.greaterThanOrEqual(
			this.minPayoutAmount,
		);

		if (!isAboveMinPayout) {
			return {
				minPayoutAmount:
					this.minPayoutAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
			};
		}

		if (
			this.shouldProcessPayout(
				payoutSchedule,
				actualPayoutAmount,
				bypassThreshold,
			)
		) {
			const fees = this.feesCalculator.payoutFees(
				actualPayoutAmount.getAmount(),
				"PayPal",
				payoutPaymentMethod.country,
			);
			const payoutLogId = await this.createPayoutLog(
				profileId,
				fees.payoutAmount,
				fees.processingFee,
				payoutPaymentMethod.id,
			);

			try {
				const payoutResponse = await this.sendPayout(
					payoutLogId,
					profileId,
					payoutPaymentMethod,
					fees.payoutAmount.getAmount() / DECIMAL_TO_CENT_FACTOR,
				);
				if (payoutResponse.status !== 201) throw new Error();

				await this.prisma.$transaction([
					this.prisma.payoutLog.update({
						where: { id: payoutLogId },
						data: { status: TransactionStatus.Submitted },
					}),
					this.prisma.balance.update({
						where: { id: balanceRecord.id },
						data: {
							amount: { decrement: fees.amount.getAmount() },
						},
					}),
				]);
			} catch (error) {
				await this.prisma.payoutLog.update({
					where: { id: payoutLogId },
					data: { status: TransactionStatus.Failed },
				});
				throw new Error("Failed to send payout");
			}
		}
	}
}

export async function payoutFactory(
	injector: Injector,
): Promise<PayoutService> {
	const [prisma, snowflake, paypalService, feesCalculator] =
		await Promise.all([
			injector.resolve(PrismaService),
			injector.resolve(SnowflakeService),
			injector.resolve(PayPalService),
			injector.resolve(FeesCalculator),
		]);

	const requiredEnvVars = ["MIN_PAYOUT_AMOUNT"];

	for (const varName of requiredEnvVars) {
		if (!process.env[varName]) {
			throw new Error(`Missing environment variable: ${varName}`);
		}
	}

	const minPayoutAmount = parseEnvVarAsNumber("MIN_PAYOUT_AMOUNT");

	return new PayoutService(
		prisma,
		snowflake,
		paypalService,
		feesCalculator,
		minPayoutAmount,
	);
}

/**
 * Parse an environment variable as a number and ensure it's valid.
 * @param varName - The environment variable name.
 * @returns The parsed number.
 * @throws An error if the variable cannot be parsed or is missing.
 */
function parseEnvVarAsNumber(varName: string): number {
	const value = Number(process.env[varName]);
	if (isNaN(value)) {
		throw new Error(
			`Environment variable ${varName} is not a valid number.`,
		);
	}
	return value;
}

export default PayoutService;
