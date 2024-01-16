import { Injectable } from "async-injection";
import axios, { AxiosInstance } from "axios";

@Injectable()
class PayPalService {
	private readonly axiosInstance: AxiosInstance;

	constructor(axiosInstance: AxiosInstance) {
		this.axiosInstance = axiosInstance;
	}

	async createOrder(orderData: {
		intent: string;
		purchase_units: {
			custom_id: string;
			amount: {
				currency_code: string;
				value: string;
			};
			description: string;
		}[];
		application_context: {
			return_url: string;
			cancel_url: string;
		};
	}): Promise<any> {
		return await this.axiosInstance.post("/v2/checkout/orders", orderData);
	}

	async captureOrder(orderId: string): Promise<any> {
		return await this.axiosInstance.post(
			`/v2/checkout/orders/${orderId}/capture`,
			{},
		);
	}

	async addProduct(productData: {
		name: string;
		description: string;
		type: string;
		category: string;
	}) {
		return await this.axiosInstance.post("/v1/catalogs/products", {
			name: productData.name,
			description: productData.description,
			type: productData.type,
			category: productData.category,
		});
	}

	async addBillingPlan(planData: {
		product_id: string;
		name: string;
		description: string;
		amount: number;
	}) {
		return await this.axiosInstance.post("/v1/billing/plans", {
			product_id: planData.product_id,
			name: planData.name,
			description: planData.description,
			status: "active",
			billing_cycles: [
				{
					frequency: {
						interval_unit: "MONTH",
						interval_count: 1,
					},
					tenure_type: "REGULAR",
					sequence: 1,
					total_cycles: 0,
					pricing_scheme: {
						fixed_price: {
							value: planData.amount,
							currency_code: "USD",
						},
					},
				},
			],
			payment_preferences: {
				payment_failure_threshold: 0,
			},
		});
	}

	async verifyWebhookEvent(data: {
		auth_algo: string;
		cert_url: string;
		transmission_id: string;
		transmission_sig: string;
		transmission_time: string;
		webhook_id: string;
		webhook_event: any;
	}) {
		const endpoint = "/v1/notifications/verify-webhook-signature";
		return await this.axiosInstance.post(endpoint, data);
	}

	async getSubscriptionDetails(subscriptionId: string) {
		return await this.axiosInstance.get(
			`/v1/billing/subscriptions/${subscriptionId}`,
		);
	}

	async sendPayout(payoutData: {
		sender_batch_header: {
			sender_batch_id: string;
			recipient_type: string;
			email_subject: string;
			email_message: string;
		};
		items: {
			amount: {
				value: string;
				currency: string;
			};
			sender_item_id: string;
			recipient_wallet: string;
			receiver: string;
			note?: string;
			recipient_type?: string;
		}[];
	}) {
		return await this.axiosInstance.post(
			"/v1/payments/payouts",
			payoutData,
		);
	}
}

export async function paypalFactory(): Promise<PayPalService> {
	const mode = process.env.PAYPAL_MODE as "sandbox" | "production";
	const clientId = process.env.PAYPAL_CLIENT_ID;
	const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

	if (!clientId) {
		throw new Error("Missing PAYPAL_CLIENT_ID");
	}

	if (!clientSecret) {
		throw new Error("Missing PAYPAL_CLIENT_SECRET");
	}

	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
		"base64",
	);

	const paypalApiUrls = {
		sandbox: "https://api-m.sandbox.paypal.com",
		production: "https://api-m.paypal.com",
	};
	const paypalApi = paypalApiUrls[mode] || paypalApiUrls.production;

	const axiosInstance = axios.create({
		baseURL: paypalApi,
		headers: {
			Authorization: `Basic ${credentials}`,
		},
	});

	return new PayPalService(axiosInstance);
}

export default PayPalService;
