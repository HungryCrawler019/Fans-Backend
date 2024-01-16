import { Injectable, Injector } from "async-injection";
import dinero, { Dinero } from "dinero.js";
import TaxJarService from "./TaxJarService.js";
import { TaxjarError } from "taxjar/dist/util/types.js";

const DECIMAL_TO_CENT_FACTOR = 100;

type PurchaseService = "Stripe" | "PayPal" | "AuthorizeNet" | "Bank";
type PayoutService = "PayPal";

@Injectable()
class FeesCalculator {
	private readonly taxJarService: TaxJarService;
	private readonly fanPlatformFee: number;
	private readonly creatorPlatformFee: number;
	private readonly creatorReferralFee: number;
	private readonly fanGemsFee: number;
	private readonly stripeFee: number;
	private readonly stripeFeeFixed: number;
	private readonly paypalFee: number;
	private readonly paypalFeeFixed: number;
	private readonly paypalFeePayoutInternationalPercentage: number;
	private readonly paypalFeePayoutUsFixed: number;
	private readonly authorizeNetFee: number;
	private readonly authorizeNetFeeFixed: number;

	constructor(
		taxJarService: TaxJarService,
		fanPlatformFee: number,
		creatorPlatformFee: number,
		creatorReferralFee: number,
		fanGemsFee: number,
		stripeFee: number,
		stripeFeeFixed: number,
		paypalFee: number,
		paypalFeeFixed: number,
		paypalFeePayoutInternationalPercentage: number,
		paypalFeePayoutUsFixed: number,
		authorizeNetFee: number,
		authorizeNetFeeFixed: number,
	) {
		this.taxJarService = taxJarService;
		this.fanPlatformFee = fanPlatformFee;
		this.creatorPlatformFee = creatorPlatformFee;
		this.creatorReferralFee = creatorReferralFee;
		this.fanGemsFee = fanGemsFee;
		this.stripeFee = stripeFee;
		this.stripeFeeFixed = stripeFeeFixed;
		this.paypalFee = paypalFee;
		this.paypalFeeFixed = paypalFeeFixed;
		this.paypalFeePayoutInternationalPercentage =
			paypalFeePayoutInternationalPercentage;
		this.paypalFeePayoutUsFixed = paypalFeePayoutUsFixed;
		this.authorizeNetFee = authorizeNetFee;
		this.authorizeNetFeeFixed = authorizeNetFeeFixed;
	}

	/**
	 * Calculates the transaction fee for creator gems.
	 * @param cents - Amount in cents.
	 * @returns An object containing the original amount, platform fee, and net amount after fees.
	 */
	creatorGemsTransactionFee(
		cents: number,
		customPlatformFee?: number | null,
		service: PurchaseService = "AuthorizeNet",
	): Record<string, Dinero> {
		const amount = dinero({ amount: cents });

		let processingFee: Dinero;
		switch (service) {
			case "Stripe": {
				const stripeProcessingFee = amount.multiply(this.stripeFee).add(
					dinero({
						amount: Math.round(
							this.stripeFeeFixed * DECIMAL_TO_CENT_FACTOR,
						),
					}),
				);
				processingFee = stripeProcessingFee;
				break;
			}
			case "PayPal": {
				const paypalProcessingFee = amount.multiply(this.paypalFee).add(
					dinero({
						amount: this.paypalFeeFixed * DECIMAL_TO_CENT_FACTOR,
					}),
				);
				processingFee = paypalProcessingFee;
				break;
			}
			case "AuthorizeNet": {
				const authorizeNetProcessingFee = amount
					.multiply(this.authorizeNetFee)
					.add(
						dinero({
							amount: Math.round(
								this.authorizeNetFeeFixed *
									DECIMAL_TO_CENT_FACTOR,
							),
						}),
					);
				processingFee = authorizeNetProcessingFee;
				break;
			}
			default:
				throw new Error(`Unsupported service: ${service}`);
		}

		const platformFee = amount.multiply(
			customPlatformFee ?? this.creatorPlatformFee,
		);
		const totalFees = processingFee.add(platformFee);
		const netAmount = amount.subtract(totalFees);

		return { amount, processingFee, platformFee, totalFees, netAmount };
	}

	/**
	 * Calculates the transaction fee for creator subscriptions.
	 * @param cents - Amount in cents.
	 * @returns An object containing the original amount, platform fee, and net amount after fees.
	 */
	creatorSubscriptionsTransactionFee(
		cents: number,
		customPlatformFee?: number | null,
		service: PurchaseService = "AuthorizeNet",
	): Record<string, Dinero> {
		const amount = dinero({ amount: cents });

		let processingFee: Dinero;
		switch (service) {
			case "Stripe": {
				const stripeProcessingFee = amount.multiply(this.stripeFee).add(
					dinero({
						amount: this.stripeFeeFixed * DECIMAL_TO_CENT_FACTOR,
					}),
				);
				processingFee = stripeProcessingFee;
				break;
			}
			case "PayPal": {
				const paypalProcessingFee = amount.multiply(this.paypalFee).add(
					dinero({
						amount: this.paypalFeeFixed * DECIMAL_TO_CENT_FACTOR,
					}),
				);
				processingFee = paypalProcessingFee;
				break;
			}
			case "AuthorizeNet": {
				const authorizeNetProcessingFee = amount
					.multiply(this.authorizeNetFee)
					.add(
						dinero({
							amount: Math.round(
								this.authorizeNetFeeFixed *
									DECIMAL_TO_CENT_FACTOR,
							),
						}),
					);
				processingFee = authorizeNetProcessingFee;
				break;
			}
			default:
				throw new Error(`Unsupported service: ${service}`);
		}

		const platformFee = amount.multiply(
			customPlatformFee ?? this.creatorPlatformFee,
		);
		const totalFees = processingFee.add(platformFee);
		const netAmount = amount.subtract(totalFees);

		return { amount, processingFee, platformFee, totalFees, netAmount };
	}

	/**
	 * Calculates the transaction fee for creator subscriptions.
	 * @param cents - Amount in cents.
	 * @returns An object containing the original amount, platform fee, and net amount after fees.
	 */
	creatorPaidPostTransactionFee(
		cents: number,
		customPlatformFee?: number | null,
		service: PurchaseService = "AuthorizeNet",
	): Record<string, Dinero> {
		const amount = dinero({ amount: cents });

		let processingFee: Dinero;
		switch (service) {
			case "Stripe": {
				const stripeProcessingFee = amount.multiply(this.stripeFee).add(
					dinero({
						amount: Math.round(
							this.stripeFeeFixed * DECIMAL_TO_CENT_FACTOR,
						),
					}),
				);
				processingFee = stripeProcessingFee;
				break;
			}
			case "PayPal": {
				const paypalProcessingFee = amount.multiply(this.paypalFee).add(
					dinero({
						amount: Math.round(
							this.paypalFeeFixed * DECIMAL_TO_CENT_FACTOR,
						),
					}),
				);
				processingFee = paypalProcessingFee;
				break;
			}
			case "AuthorizeNet": {
				const authorizeNetProcessingFee = amount
					.multiply(this.authorizeNetFee)
					.add(
						dinero({
							amount: Math.round(
								this.authorizeNetFeeFixed *
									DECIMAL_TO_CENT_FACTOR,
							),
						}),
					);
				processingFee = authorizeNetProcessingFee;
				break;
			}
			default:
				throw new Error(`Unsupported service: ${service}`);
		}

		const platformFee = amount.multiply(
			customPlatformFee ?? this.creatorPlatformFee,
		);
		const totalFees = processingFee.add(platformFee);
		const netAmount = amount.subtract(totalFees);

		return { amount, processingFee, platformFee, totalFees, netAmount };
	}

	/**
	 * Calculates the transaction fee for creator subscriptions.
	 * @param cents - Amount in cents.
	 * @returns An object containing the original amount, platform fee, and net amount after fees.
	 */
	creatorCameoPaymentFee(
		cents: number,
		customPlatformFee?: number | null,
		service: PurchaseService = "AuthorizeNet",
	): Record<string, Dinero> {
		const amount = dinero({ amount: cents });

		let processingFee: Dinero;
		switch (service) {
			case "Stripe": {
				const stripeProcessingFee = amount.multiply(this.stripeFee).add(
					dinero({
						amount: Math.round(
							this.stripeFeeFixed * DECIMAL_TO_CENT_FACTOR,
						),
					}),
				);
				processingFee = stripeProcessingFee;
				break;
			}
			case "PayPal": {
				const paypalProcessingFee = amount.multiply(this.paypalFee).add(
					dinero({
						amount: Math.round(
							this.paypalFeeFixed * DECIMAL_TO_CENT_FACTOR,
						),
					}),
				);
				processingFee = paypalProcessingFee;
				break;
			}
			case "AuthorizeNet": {
				const authorizeNetProcessingFee = amount
					.multiply(this.authorizeNetFee)
					.add(
						dinero({
							amount: Math.round(
								this.authorizeNetFeeFixed *
									DECIMAL_TO_CENT_FACTOR,
							),
						}),
					);
				processingFee = authorizeNetProcessingFee;
				break;
			}
			default:
				throw new Error(`Unsupported service: ${service}`);
		}

		const platformFee = amount.multiply(
			customPlatformFee ?? this.creatorPlatformFee,
		);
		const totalFees = processingFee.add(platformFee);
		const netAmount = amount.subtract(totalFees);

		return { amount, processingFee, platformFee, totalFees, netAmount };
	}

	private cleanEventData(eventData: any): any {
		if (eventData !== null && typeof eventData === "object") {
			Object.keys(eventData).forEach((key) => {
				if (eventData[key] && typeof eventData[key] === "object") {
					this.cleanEventData(eventData[key]);
				} else if (eventData[key] === "" || eventData[key] === null) {
					delete eventData[key];
				}
			});
		}
		return eventData;
	}

	/**
	 * Calculates the transaction fees based on the purchase service used.
	 * @param cents - Amount in cents.
	 * @param customerInformation - The customer information.
	 * @returns An object detailing the amount, processing fee, platform fee, total fees, and total amount after fees.
	 */
	async purchaseServiceFees(
		cents: number,
		customerInformation?: {
			country: string;
			zip: string;
			state: string;
			city: string;
			address: string;
		},
	): Promise<Record<string, Dinero> | TaxjarError> {
		const amount = dinero({ amount: cents });
		const platformFee = amount.multiply(this.fanPlatformFee);
		const subtotal = amount.add(platformFee);

		let vatFee = dinero({ amount: 0 });

		const cleanedData = this.cleanEventData(customerInformation);

		if (cleanedData?.country) {
			const orderDetails = {
				to_country: cleanedData.country,
				to_state: cleanedData.state,
				to_zip: cleanedData.zip,
				to_city: cleanedData.city,
				to_street: cleanedData.address,
				amount: subtotal.toUnit(),
				shipping: 0,
			};

			const taxResponse = await this.taxJarService
				.calculateTax(orderDetails)
				.catch((e) => {
					return e;
				});

			if (taxResponse instanceof TaxjarError) {
				return taxResponse;
			}

			if (taxResponse?.tax?.amount_to_collect) {
				vatFee = dinero({
					amount: Math.round(
						taxResponse.tax.amount_to_collect *
							DECIMAL_TO_CENT_FACTOR,
					),
				});
			}
		}

		const totalAmount = subtotal.add(vatFee);

		return { amount, platformFee, vatFee, totalAmount };
	}

	/**
	 * Calculates the gem transaction fees based on the purchase service used.
	 * @param cents - Amount in cents.
	 * @param customerInformation - The customer information.
	 * @returns An object detailing the amount, processing fee, platform fee, total fees, and total amount after fees.
	 */
	async purchaseGemsServiceFees(
		cents: number,
		customerInformation?: {
			country: string;
			zip: string;
			state: string;
			city: string;
			address: string;
		},
	): Promise<Record<string, Dinero> | TaxjarError> {
		const amount = dinero({ amount: cents });
		const platformFee = amount.multiply(this.fanGemsFee);
		const subtotal = amount.add(platformFee);

		let vatFee = dinero({ amount: 0 });

		const cleanedData = this.cleanEventData(customerInformation);

		if (cleanedData?.country) {
			const orderDetails = {
				to_country: cleanedData.country,
				to_state: cleanedData.state,
				to_zip: cleanedData.zip,
				to_city: cleanedData.city,
				to_street: cleanedData.address,
				amount: subtotal.toUnit(),
				shipping: 0,
			};

			const taxResponse = await this.taxJarService
				.calculateTax(orderDetails)
				.catch((e) => {
					return e;
				});

			if (taxResponse instanceof TaxjarError) {
				return taxResponse;
			}

			if (taxResponse?.tax?.amount_to_collect) {
				vatFee = dinero({
					amount: Math.round(
						taxResponse.tax.amount_to_collect *
							DECIMAL_TO_CENT_FACTOR,
					),
				});
			}
		}

		const totalAmount = subtotal.add(vatFee);

		return { amount, platformFee, vatFee, totalAmount };
	}

	/**
	 * Calculates the payout fees based on the payout service and country.
	 * @param cents - Amount in cents.
	 * @param service - The payout service used.
	 * @param country - The country for the payout.
	 * @returns An object detailing the amount, platform fee, processing fee, total fees, and total amount after fees.
	 */
	payoutFees(
		cents: number,
		service: PayoutService,
		country: string,
	): Record<string, Dinero> {
		const amount = dinero({ amount: cents });

		let processingFee: Dinero;
		switch (service) {
			case "PayPal":
				processingFee =
					country === "US"
						? dinero({
								amount: Math.round(
									this.paypalFeePayoutUsFixed *
										DECIMAL_TO_CENT_FACTOR,
								),
						  })
						: amount.multiply(
								this.paypalFeePayoutInternationalPercentage,
						  );
				break;

			default:
				throw new Error(`Unsupported payout service: ${service}`);
		}

		const totalFee = processingFee;
		const payoutAmount = amount.subtract(totalFee);

		return {
			amount,
			processingFee,
			totalFee,
			payoutAmount,
		};
	}

	calcCreatorReferralFee(cents: number): Dinero {
		const amount = dinero({ amount: cents });
		return amount.multiply(this.creatorReferralFee);
	}
}

export async function feesCalculatorFactory(
	injector: Injector,
): Promise<FeesCalculator> {
	const taxJarService = await injector.resolve(TaxJarService);

	const requiredEnvVars = [
		"FAN_PLATFORM_FEE",
		"CREATOR_PLATFORM_FEE",
		"FAN_GEMS_FEE",
		"STRIPE_FEE",
		"STRIPE_FEE_FIXED",
		"PAYPAL_FEE",
		"PAYPAL_FEE_FIXED",
		"PAYPAL_FEE_PAYOUT_INTERNATIONAL_PERCENTAGE",
		"PAYPAL_FEE_PAYOUT_US_FIXED",
		"AUTHORIZE_NET_FEE",
		"AUTHORIZE_NET_FEE_FIXED",
	];

	for (const varName of requiredEnvVars) {
		if (!process.env[varName]) {
			throw new Error(`Missing environment variable: ${varName}`);
		}
	}

	const fanPlatformFee = parseEnvVarAsNumber("FAN_PLATFORM_FEE");
	const creatorPlatformFee = parseEnvVarAsNumber("CREATOR_PLATFORM_FEE");
	const creatorReferralFee = parseEnvVarAsNumber("CREATOR_REFERRAL_FEE");
	const fanGemsFee = parseEnvVarAsNumber("FAN_GEMS_FEE");
	const stripeFee = parseEnvVarAsNumber("STRIPE_FEE");
	const stripeFeeFixed = parseEnvVarAsNumber("STRIPE_FEE_FIXED");
	const paypalFee = parseEnvVarAsNumber("PAYPAL_FEE");
	const paypalFeeFixed = parseEnvVarAsNumber("PAYPAL_FEE_FIXED");
	const paypalFeePayoutInternationalPercentage = parseEnvVarAsNumber(
		"PAYPAL_FEE_PAYOUT_INTERNATIONAL_PERCENTAGE",
	);
	const paypalFeePayoutUsFixed = parseEnvVarAsNumber(
		"PAYPAL_FEE_PAYOUT_US_FIXED",
	);
	const authorizeNetFee = parseEnvVarAsNumber("AUTHORIZE_NET_FEE");
	const authorizeNetFeeFixed = parseEnvVarAsNumber("AUTHORIZE_NET_FEE_FIXED");

	return new FeesCalculator(
		taxJarService,
		fanPlatformFee,
		creatorPlatformFee,
		creatorReferralFee,
		fanGemsFee,
		stripeFee,
		stripeFeeFixed,
		paypalFee,
		paypalFeeFixed,
		paypalFeePayoutInternationalPercentage,
		paypalFeePayoutUsFixed,
		authorizeNetFee,
		authorizeNetFeeFixed,
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

export default FeesCalculator;
