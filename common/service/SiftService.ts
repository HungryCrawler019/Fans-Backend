import { Injectable, Injector } from "async-injection";
import axios, { AxiosInstance } from "axios";
import { Logger } from "pino";

interface Address {
	$name: string;
	$address_1: string;
	$city: string;
	$region: string;
	$country: string;
	$zipcode: string;
}

interface PaymentMethod {
	$payment_type: "$digital_wallet" | "$credit_card";
	$payment_gateway?: "$stripe" | "$authorizenet" | "$paypal";
	$account_holder_name?: string;
	$card_bin?: string;
	$card_last4?: string;
	$verification_status?: "$success" | "$failure" | "$pending";
}

interface BrowserInfo {
	$user_agent?: string;
	$accept_language?: string;
}

interface AccountEvent {
	$user_id: string;
	$user_email?: string;
	$name?: string;
	$social_sign_on_type?: string;
	$account_types?: string[];
	$ip?: string;
	$billing_address?: Address;
	$payment_methods?: PaymentMethod[];
	$browser?: BrowserInfo;
}

interface LoginLogoutEvent {
	$user_id: string;
	$ip?: string;
	$login_status?: "$success" | "$failure";
	$failure_reason?:
		| "$account_unknown"
		| "$account_suspended"
		| "$account_disabled"
		| "$wrong_password";
	$user_email?: string;
	$username?: string;
	$browser: BrowserInfo;
}

interface OrderEvent {
	$user_id: string;
	$order_id: string;
	$user_email: string;
	$ip?: string;
	$amount?: number;
	$currency_code?: string;
	$billing_address?: Address;
	$payment_methods?: PaymentMethod[];
	$browser?: BrowserInfo;
}

interface TransactionEvent {
	$user_id: string;
	$user_email?: string;
	$amount: number;
	$currency_code: string;
	$order_id?: string;
	$transaction_id: string;
	$transaction_type: "$sale" | "$transfer" | "$refund";
	$transaction_status: "$success" | "$failure" | "$pending";
	$decline_category?: string;
	$ip?: string;
	$seller_user_id?: string;
	$transfer_recipient_user_id?: string;
	$billing_address?: Address;
	$payment_method?: PaymentMethod;
	$browser?: BrowserInfo;
}

interface ChargebackEvent {
	$user_id: string;
	$order_id: string;
	$transaction_id: string;
	$chargeback_state:
		| "$received"
		| "$accepted"
		| "$won"
		| "$disputed"
		| "$lost";
	$chargeback_reason?:
		| "$fraud"
		| "$duplicate"
		| "$product_not_received"
		| "$product_unacceptable"
		| "$other";
}

interface SiftScoreResponse {
	status: number;
	error_message: string;
	request: string;
	time: number;
	score_response: ScoreResponse;
	http_status_code: number;
}

interface WorkflowStatus {
	id: string;
	config: {
		id: string;
		version: string;
	};
	config_display_name: string;
	abuse_types: string[];
	state: string;
	entity: {
		id: string;
		type: string;
	};
	history: Array<{
		app: string;
		name: string;
		state: string;
		config: {
			decision_id?: string;
		};
	}>;
}

interface ScoreResponse {
	status: number;
	error_message: string;
	user_id: string;
	scores: {
		[key: string]: AbuseScore;
	};
	latest_labels: {
		[key: string]: LabelInfo;
	};
	workflow_statuses: WorkflowStatus[];
}

interface AbuseScore {
	score: number;
	percentiles: {
		last_1_day: number;
		last_5_days: number;
		last_7_days: number;
		last_10_days: number;
	};
	reasons: Reason[];
}

interface Reason {
	name: string;
	value: string;
	details?: any; // Use a more specific type if the structure of details is known.
}

interface LabelInfo {
	is_fraud: boolean;
	time: number;
	description: string;
}

@Injectable()
class SiftService {
	private readonly axiosInstance: AxiosInstance;
	private readonly apiKey: string;

	constructor(axiosInstance: AxiosInstance, apiKey: string) {
		this.axiosInstance = axiosInstance;
		this.apiKey = apiKey;
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

	private async sendEvent(
		eventData: any,
		requestScore: boolean = false,
	): Promise<any> {
		if (this.apiKey === "") return;

		const cleanedEventData = this.cleanEventData(eventData);

		let url = "/events";
		if (requestScore) {
			url +=
				"?return_workflow_status=true&force_workflow_run=true&abuse_types=payment_abuse";
		}

		const response = await this.axiosInstance.post(url, cleanedEventData);
		return response.data as SiftScoreResponse;
	}

	async createAccount(accountData: AccountEvent): Promise<any> {
		return await this.sendEvent({
			$type: "$create_account",
			$api_key: this.apiKey,
			$site_domain: "fyp.fans",
			$time: Date.now(),
			...accountData,
		});
	}

	async updateAccount(accountData: AccountEvent): Promise<any> {
		return await this.sendEvent({
			$type: "$update_account",
			$api_key: this.apiKey,
			$site_domain: "fyp.fans",
			$time: Date.now(),
			...accountData,
		});
	}

	async login(loginData: LoginLogoutEvent): Promise<any> {
		return await this.sendEvent({
			$type: "$login",
			$api_key: this.apiKey,
			$site_domain: "fyp.fans",
			$time: Date.now(),
			...loginData,
		});
	}

	async logout(logoutData: LoginLogoutEvent): Promise<any> {
		return await this.sendEvent({
			$type: "$logout",
			$api_key: this.apiKey,
			$site_domain: "fyp.fans",
			$time: Date.now(),
			...logoutData,
		});
	}

	async createOrder(orderData: OrderEvent): Promise<SiftScoreResponse> {
		return await this.sendEvent(
			{
				$type: "$create_order",
				$api_key: this.apiKey,
				$site_domain: "fyp.fans",
				$time: Date.now(),
				...orderData,
			},
			true,
		);
	}

	async updateOrder(orderData: OrderEvent): Promise<any> {
		return await this.sendEvent({
			$type: "$update_order",
			$api_key: this.apiKey,
			$site_domain: "fyp.fans",
			$time: Date.now(),
			...orderData,
		});
	}

	async transaction(
		transactionData: TransactionEvent,
	): Promise<SiftScoreResponse> {
		return await this.sendEvent(
			{
				$type: "$transaction",
				$api_key: this.apiKey,
				$site_domain: "fyp.fans",
				$time: Date.now(),
				...transactionData,
			},
			true,
		);
	}

	async chargeback(chargebackData: ChargebackEvent): Promise<any> {
		return await this.sendEvent({
			$type: "$chargeback",
			$api_key: this.apiKey,
			$time: Date.now(),
			...chargebackData,
		});
	}
}

export async function siftFactory(injector: Injector): Promise<SiftService> {
	const logger = await injector.resolve<Logger>("logger");
	const apiKey = process.env.SIFT_API_KEY || "";

	if (apiKey === "") {
		logger.warn(
			"Sift API key not set. Sift integration will not be available.",
		);
	}

	const siftApiUrl = "https://api.sift.com/v205";

	const axiosInstance = axios.create({
		baseURL: siftApiUrl,
	});

	return new SiftService(axiosInstance, apiKey);
}

export default SiftService;
