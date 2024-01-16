import { Injectable } from "async-injection";
import pkg from "authorizenet";
import { createHmac } from "node:crypto";
import axios from "axios";
import {
	FastifyRequest,
	FastifyReply,
	preHandlerAsyncHookHandler,
} from "fastify";

import APIErrors from "../../web/errors/index.js";

const { APIContracts, APIControllers, Constants } = pkg;

interface WebhookLink {
	self: {
		href: string;
	};
}

interface Webhook {
	_links: WebhookLink;
	webhookId: string;
	name: string;
	eventTypes: string[];
	status: string;
	url: string;
}

@Injectable()
class AuthorizeNetService {
	readonly #environment: string;
	readonly #apiLoginKey: string;
	readonly #transactionKey: string;
	private readonly signatureKey: string;

	constructor(
		environment: string,
		apiLoginKey: string,
		transactionKey: string,
		signatureKey: string,
	) {
		this.#environment = environment;
		this.#apiLoginKey = apiLoginKey;
		this.#transactionKey = transactionKey;
		this.signatureKey = signatureKey;
	}

	get apiLoginKey(): string {
		return this.#apiLoginKey;
	}

	get environment(): string {
		return this.#environment === "PRODUCTION"
			? Constants.endpoint.production
			: Constants.endpoint.sandbox;
	}

	get baseUrl(): string {
		return this.#environment === "PRODUCTION"
			? "https://api.authorize.net/rest/v1"
			: "https://apitest.authorize.net/rest/v1";
	}

	get headers(): { "Content-Type": string; Authorization: string } {
		const authString = `${this.#apiLoginKey}:${this.#transactionKey}`;
		const encodedAuthString = Buffer.from(authString).toString("base64");

		return {
			"Content-Type": "application/json",
			Authorization: `Basic ${encodedAuthString}`,
		};
	}

	async fetchWebhooks(): Promise<Webhook[]> {
		const baseUrl = `${this.baseUrl}/webhooks`;

		try {
			const response = await axios.get(baseUrl, {
				headers: this.headers,
			});
			return new Promise((resolve, reject) => {
				if (response.data) {
					resolve(response.data);
				} else {
					reject(new Error("No data received."));
				}
			});
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject(error);
			});
		}
	}

	webhookPrehandler: preHandlerAsyncHookHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> => {
		try {
			const webhooks = await this.fetchWebhooks();
			const areAllWebhooksActive = webhooks.every(
				(webhook) => webhook.status === "active",
			);

			if (!areAllWebhooksActive) {
				reply.sendError(APIErrors.WEBHOOK_STATUS_INACTIVE);
				return;
			}
		} catch (error) {
			reply.sendError(APIErrors.WEBHOOK_STATUS_INACTIVE);
		}
	};

	async getTransactionDetails(
		transactionId: string,
	): Promise<pkg.APIContracts.GetTransactionDetailsResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const getRequest = new APIContracts.GetTransactionDetailsRequest();
		getRequest.setMerchantAuthentication(merchantAuthenticationType);
		getRequest.setTransId(transactionId);

		return new Promise<pkg.APIContracts.GetTransactionDetailsResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.GetTransactionDetailsController(
					getRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.GetTransactionDetailsResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async refundTransaction(
		transactionId: string,
		last4Digits: string,
		amount: string,
	): Promise<pkg.APIContracts.CreateTransactionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const creditCard = new APIContracts.CreditCardType();

		creditCard.setCardNumber(last4Digits);
		creditCard.setExpirationDate("XXXX");

		const paymentType = new APIContracts.PaymentType();
		paymentType.setCreditCard(creditCard);

		const transactionRequestType =
			new APIContracts.TransactionRequestType();
		transactionRequestType.setTransactionType(
			APIContracts.TransactionTypeEnum.REFUNDTRANSACTION,
		);
		transactionRequestType.setPayment(paymentType);
		transactionRequestType.setAmount(amount);
		transactionRequestType.setRefTransId(transactionId);

		const createRequest = new APIContracts.CreateTransactionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setTransactionRequest(transactionRequestType);

		return new Promise<pkg.APIContracts.CreateTransactionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.CreateTransactionController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response = new APIContracts.CreateTransactionResponse(
						apiResponse,
					);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async createAcceptPaymentTransaction(transactionDetails: {
		opaqueDataValue: string;
		description: string;
		amount: number;
		customerData: {
			email: string;
			firstName: string;
			lastName: string;
			company?: string;
			address?: string;
			city?: string;
			state?: string;
			zip?: string;
			country?: string;
		};
		merchantData: {
			userId: string;
			transactionId: string;
		};
	}): Promise<pkg.APIContracts.CreateTransactionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const opaqueData = new APIContracts.OpaqueDataType();
		opaqueData.setDataDescriptor("COMMON.ACCEPT.INAPP.PAYMENT");
		opaqueData.setDataValue(transactionDetails.opaqueDataValue);

		const paymentType = new APIContracts.PaymentType();
		paymentType.setOpaqueData(opaqueData);

		const orderDetails = new APIContracts.OrderType();
		orderDetails.setInvoiceNumber(`INV-${new Date().getTime()}`);
		orderDetails.setDescription(
			`${transactionDetails.description} | User ID: ${transactionDetails.merchantData.userId} | Transaction ID: ${transactionDetails.merchantData.transactionId}`,
		);

		const customerData = new APIContracts.CustomerDataType();
		customerData.setEmail(transactionDetails.customerData.email);

		const nameAndAddress = new APIContracts.NameAndAddressType();
		nameAndAddress.setFirstName(transactionDetails.customerData.firstName);
		nameAndAddress.setLastName(transactionDetails.customerData.lastName);

		if (transactionDetails.customerData.company) {
			nameAndAddress.setCompany(transactionDetails.customerData.company);
		}
		if (transactionDetails.customerData.address) {
			nameAndAddress.setAddress(transactionDetails.customerData.address);
		}
		if (transactionDetails.customerData.city) {
			nameAndAddress.setCity(transactionDetails.customerData.city);
		}
		if (transactionDetails.customerData.state) {
			nameAndAddress.setState(transactionDetails.customerData.state);
		}
		if (transactionDetails.customerData.zip) {
			nameAndAddress.setZip(transactionDetails.customerData.zip);
		}
		if (transactionDetails.customerData.country) {
			nameAndAddress.setCountry(transactionDetails.customerData.country);
		}

		const transactionRequestType =
			new APIContracts.TransactionRequestType();
		transactionRequestType.setTransactionType(
			APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION,
		);
		transactionRequestType.setPayment(paymentType);
		transactionRequestType.setAmount(transactionDetails.amount);
		transactionRequestType.setOrder(orderDetails);
		transactionRequestType.setCustomer(customerData);
		transactionRequestType.setBillTo(nameAndAddress);

		const createRequest = new APIContracts.CreateTransactionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setTransactionRequest(transactionRequestType);

		return new Promise<pkg.APIContracts.CreateTransactionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.CreateTransactionController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response = new APIContracts.CreateTransactionResponse(
						apiResponse,
					);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async authorizeCreditCard(transactionDetails: {
		customerProfileId: string;
		customerPaymentProfileId: string;
		customerAddressId?: string;
		description: string;
		amount: number;
		merchantData: {
			userId: string;
			transactionId: string;
		};
	}): Promise<pkg.APIContracts.CreateTransactionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const profileToCharge = new APIContracts.CustomerProfilePaymentType();
		profileToCharge.setCustomerProfileId(
			transactionDetails.customerProfileId,
		);

		const paymentProfile = new APIContracts.PaymentProfile();
		paymentProfile.setPaymentProfileId(
			transactionDetails.customerPaymentProfileId,
		);
		profileToCharge.setPaymentProfile(paymentProfile);

		const orderDetails = new APIContracts.OrderType();
		orderDetails.setInvoiceNumber(`INV-${new Date().getTime()}`);
		orderDetails.setDescription(
			`${transactionDetails.description} | User ID: ${transactionDetails.merchantData.userId} | Transaction ID: ${transactionDetails.merchantData.transactionId}`,
		);

		const transactionRequestType =
			new APIContracts.TransactionRequestType();
		transactionRequestType.setTransactionType(
			APIContracts.TransactionTypeEnum.AUTHONLYTRANSACTION,
		);
		transactionRequestType.setProfile(profileToCharge);
		transactionRequestType.setAmount(transactionDetails.amount);
		transactionRequestType.setOrder(orderDetails);

		const createRequest = new APIContracts.CreateTransactionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setTransactionRequest(transactionRequestType);

		return new Promise<pkg.APIContracts.CreateTransactionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.CreateTransactionController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response = new APIContracts.CreateTransactionResponse(
						apiResponse,
					);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async capturePreviouslyAuthorizedAmount(transactionDetails: {
		transactionId: string;
		description: string;
		amount: number;
		merchantData: {
			userId: string;
			transactionId: string;
		};
	}): Promise<pkg.APIContracts.CreateTransactionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const orderDetails = new APIContracts.OrderType();
		orderDetails.setInvoiceNumber(`INV-${new Date().getTime()}`);
		orderDetails.setDescription(
			`${transactionDetails.description} | User ID: ${transactionDetails.merchantData.userId} | Transaction ID: ${transactionDetails.merchantData.transactionId}`,
		);

		const transactionRequestType =
			new APIContracts.TransactionRequestType();
		transactionRequestType.setTransactionType(
			APIContracts.TransactionTypeEnum.PRIORAUTHCAPTURETRANSACTION,
		);
		transactionRequestType.setRefTransId(transactionDetails.transactionId);
		transactionRequestType.setOrder(orderDetails);

		const createRequest = new APIContracts.CreateTransactionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setTransactionRequest(transactionRequestType);

		return new Promise<pkg.APIContracts.CreateTransactionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.CreateTransactionController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response = new APIContracts.CreateTransactionResponse(
						apiResponse,
					);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async createPaymentTransaction(transactionDetails: {
		customerProfileId: string;
		customerPaymentProfileId: string;
		customerAddressId?: string;
		description: string;
		amount: number;
		merchantData: {
			userId: string;
			transactionId: string;
		};
	}): Promise<pkg.APIContracts.CreateTransactionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const profileToCharge = new APIContracts.CustomerProfilePaymentType();
		profileToCharge.setCustomerProfileId(
			transactionDetails.customerProfileId,
		);

		const paymentProfile = new APIContracts.PaymentProfile();
		paymentProfile.setPaymentProfileId(
			transactionDetails.customerPaymentProfileId,
		);
		profileToCharge.setPaymentProfile(paymentProfile);

		const orderDetails = new APIContracts.OrderType();
		orderDetails.setInvoiceNumber(`INV-${new Date().getTime()}`);
		orderDetails.setDescription(
			`${transactionDetails.description} | User ID: ${transactionDetails.merchantData.userId} | Transaction ID: ${transactionDetails.merchantData.transactionId}`,
		);

		const transactionRequestType =
			new APIContracts.TransactionRequestType();
		transactionRequestType.setTransactionType(
			APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION,
		);
		transactionRequestType.setAmount(transactionDetails.amount);
		transactionRequestType.setOrder(orderDetails);
		transactionRequestType.setProfile(profileToCharge);

		const createRequest = new APIContracts.CreateTransactionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setTransactionRequest(transactionRequestType);

		return new Promise<pkg.APIContracts.CreateTransactionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.CreateTransactionController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response = new APIContracts.CreateTransactionResponse(
						apiResponse,
					);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async createCustomerProfile(customerDetails: {
		opaqueDataValue: string;
		customerData: {
			email: string;
			firstName: string;
			lastName: string;
			company?: string;
			address?: string;
			city?: string;
			state?: string;
			zip?: string;
			country?: string;
			phoneNumber?: string;
		};
	}): Promise<pkg.APIContracts.CreateCustomerProfileResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const opaqueData = new APIContracts.OpaqueDataType();
		opaqueData.setDataDescriptor("COMMON.ACCEPT.INAPP.PAYMENT");
		opaqueData.setDataValue(customerDetails.opaqueDataValue);

		const paymentType = new APIContracts.PaymentType();
		paymentType.setOpaqueData(opaqueData);

		const customerAddress = new APIContracts.CustomerAddressType();
		customerAddress.setFirstName(customerDetails.customerData.firstName);
		customerAddress.setLastName(customerDetails.customerData.lastName);

		if (customerDetails.customerData.company) {
			customerAddress.setCompany(customerDetails.customerData.company);
		}
		if (customerDetails.customerData.address) {
			customerAddress.setAddress(customerDetails.customerData.address);
		}
		if (customerDetails.customerData.city) {
			customerAddress.setCity(customerDetails.customerData.city);
		}
		if (customerDetails.customerData.state) {
			customerAddress.setState(customerDetails.customerData.state);
		}
		if (customerDetails.customerData.zip) {
			customerAddress.setZip(customerDetails.customerData.zip);
		}
		if (customerDetails.customerData.country) {
			customerAddress.setCountry(customerDetails.customerData.country);
		}

		const customerPaymentProfileType =
			new APIContracts.CustomerPaymentProfileType();
		customerPaymentProfileType.setCustomerType(
			APIContracts.CustomerTypeEnum.INDIVIDUAL,
		);
		customerPaymentProfileType.setPayment(paymentType);
		customerPaymentProfileType.setBillTo(customerAddress);

		const paymentProfilesList = [];
		paymentProfilesList.push(customerPaymentProfileType);

		const customerProfileType = new APIContracts.CustomerProfileType();
		customerProfileType.setEmail(customerDetails.customerData.email);
		customerProfileType.setPaymentProfiles(paymentProfilesList);

		const createRequest = new APIContracts.CreateCustomerProfileRequest();
		createRequest.setProfile(customerProfileType);
		createRequest.setValidationMode(
			APIContracts.ValidationModeEnum.TESTMODE,
		);
		createRequest.setMerchantAuthentication(merchantAuthenticationType);

		return new Promise<pkg.APIContracts.CreateCustomerProfileResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.CreateCustomerProfileController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.CreateCustomerProfileResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async appendPaymentMethodToCustomerProfile(customerDetails: {
		customerProfileId: string;
		opaqueDataValue: string;
		customerData: {
			email: string;
			firstName: string;
			lastName: string;
			company?: string;
			address?: string;
			city?: string;
			state?: string;
			zip?: string;
			country?: string;
			phoneNumber?: string;
		};
	}): Promise<pkg.APIContracts.CreateCustomerPaymentProfileResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const opaqueData = new APIContracts.OpaqueDataType();
		opaqueData.setDataDescriptor("COMMON.ACCEPT.INAPP.PAYMENT");
		opaqueData.setDataValue(customerDetails.opaqueDataValue);

		const paymentType = new APIContracts.PaymentType();
		paymentType.setOpaqueData(opaqueData);

		const customerAddress = new APIContracts.CustomerAddressType();
		customerAddress.setFirstName(customerDetails.customerData.firstName);
		customerAddress.setLastName(customerDetails.customerData.lastName);

		if (customerDetails.customerData.company) {
			customerAddress.setCompany(customerDetails.customerData.company);
		}
		if (customerDetails.customerData.address) {
			customerAddress.setAddress(customerDetails.customerData.address);
		}
		if (customerDetails.customerData.city) {
			customerAddress.setCity(customerDetails.customerData.city);
		}
		if (customerDetails.customerData.state) {
			customerAddress.setState(customerDetails.customerData.state);
		}
		if (customerDetails.customerData.zip) {
			customerAddress.setZip(customerDetails.customerData.zip);
		}
		if (customerDetails.customerData.country) {
			customerAddress.setCountry(customerDetails.customerData.country);
		}

		const profile = new APIContracts.CustomerPaymentProfileType();
		profile.setPayment(paymentType);
		profile.setBillTo(customerAddress);
		profile.setDefaultPaymentProfile(true);

		const createRequest =
			new APIContracts.CreateCustomerPaymentProfileRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setCustomerProfileId(customerDetails.customerProfileId);
		createRequest.setPaymentProfile(profile);

		return new Promise<pkg.APIContracts.CreateCustomerPaymentProfileResponse>(
			(resolve, reject) => {
				const ctrl =
					new APIControllers.CreateCustomerPaymentProfileController(
						createRequest.getJSON(),
					);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.CreateCustomerPaymentProfileResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async updatePaymentMethodToCustomerProfile(customerDetails: {
		customerProfileId: string;
		customerPaymentProfileId: string;
		opaqueDataValue: string;
		customerData: {
			firstName: string;
			lastName: string;
			company?: string;
			address?: string;
			city?: string;
			state?: string;
			zip?: string;
			country?: string;
			phoneNumber?: string;
		};
	}): Promise<pkg.APIContracts.UpdateCustomerPaymentProfileResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const opaqueData = new APIContracts.OpaqueDataType();
		opaqueData.setDataDescriptor("COMMON.ACCEPT.INAPP.PAYMENT");
		opaqueData.setDataValue(customerDetails.opaqueDataValue);

		const paymentType = new APIContracts.PaymentType();
		paymentType.setOpaqueData(opaqueData);

		const nameAndAddress = new APIContracts.NameAndAddressType();
		nameAndAddress.setFirstName(customerDetails.customerData.firstName);
		nameAndAddress.setLastName(customerDetails.customerData.lastName);

		if (customerDetails.customerData.company) {
			nameAndAddress.setCompany(customerDetails.customerData.company);
		}
		if (customerDetails.customerData.address) {
			nameAndAddress.setAddress(customerDetails.customerData.address);
		}
		if (customerDetails.customerData.city) {
			nameAndAddress.setCity(customerDetails.customerData.city);
		}
		if (customerDetails.customerData.state) {
			nameAndAddress.setState(customerDetails.customerData.state);
		}
		if (customerDetails.customerData.zip) {
			nameAndAddress.setZip(customerDetails.customerData.zip);
		}
		if (customerDetails.customerData.country) {
			nameAndAddress.setCountry(customerDetails.customerData.country);
		}

		const customerForUpdate =
			new APIContracts.CustomerPaymentProfileExType();
		customerForUpdate.setPayment(paymentType);
		customerForUpdate.setCustomerPaymentProfileId(
			customerDetails.customerPaymentProfileId,
		);
		// customerForUpdate.setDefaultPaymentProfile(true);
		customerForUpdate.setBillTo(nameAndAddress);

		const updateRequest =
			new APIContracts.UpdateCustomerPaymentProfileRequest();
		updateRequest.setMerchantAuthentication(merchantAuthenticationType);
		updateRequest.setCustomerProfileId(customerDetails.customerProfileId);
		updateRequest.setPaymentProfile(customerForUpdate);
		updateRequest.setValidationMode(
			APIContracts.ValidationModeEnum.LIVEMODE,
		);

		return new Promise<pkg.APIContracts.UpdateCustomerPaymentProfileResponse>(
			(resolve, reject) => {
				const ctrl =
					new APIControllers.UpdateCustomerPaymentProfileController(
						updateRequest.getJSON(),
					);

				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.UpdateCustomerPaymentProfileResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("Null response received"));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async deleteCustomerPaymentProfile(
		customerProfileId: string,
		customerPaymentProfileId: string,
	): Promise<pkg.APIContracts.DeleteCustomerPaymentProfileResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const deleteRequest =
			new APIContracts.DeleteCustomerPaymentProfileRequest();
		deleteRequest.setMerchantAuthentication(merchantAuthenticationType);
		deleteRequest.setCustomerProfileId(customerProfileId);
		deleteRequest.setCustomerPaymentProfileId(customerPaymentProfileId);

		return new Promise<pkg.APIContracts.DeleteCustomerPaymentProfileResponse>(
			(resolve, reject) => {
				const ctrl =
					new APIControllers.DeleteCustomerPaymentProfileController(
						deleteRequest.getJSON(),
					);

				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.DeleteCustomerPaymentProfileResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("Null response received"));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async fetchCustomerProfile(
		customerProfileId: string,
	): Promise<pkg.APIContracts.GetCustomerProfileResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const getRequest = new APIContracts.GetCustomerProfileRequest();
		getRequest.setMerchantAuthentication(merchantAuthenticationType);
		getRequest.setCustomerProfileId(customerProfileId);
		getRequest.setUnmaskExpirationDate(true);

		return new Promise<pkg.APIContracts.GetCustomerProfileResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.GetCustomerProfileController(
					getRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.GetCustomerProfileResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async fetchCustomerPaymentProfile(
		customerProfileId: string,
		customerPaymentProfileId: string,
	): Promise<pkg.APIContracts.GetCustomerPaymentProfileResponse> {
		return new Promise((resolve, reject) => {
			const merchantAuthenticationType =
				new APIContracts.MerchantAuthenticationType();
			merchantAuthenticationType.setName(this.#apiLoginKey);
			merchantAuthenticationType.setTransactionKey(this.#transactionKey);

			const getRequest =
				new APIContracts.GetCustomerPaymentProfileRequest();
			getRequest.setMerchantAuthentication(merchantAuthenticationType);
			getRequest.setCustomerProfileId(customerProfileId);
			getRequest.setCustomerPaymentProfileId(customerPaymentProfileId);
			getRequest.setUnmaskExpirationDate(true);

			const ctrl = new APIControllers.GetCustomerProfileController(
				getRequest.getJSON(),
			);

			ctrl.setEnvironment(this.environment);
			ctrl.execute(() => {
				const apiResponse = ctrl.getResponse();
				const response =
					new APIContracts.GetCustomerPaymentProfileResponse(
						apiResponse,
					);

				if (response != null) {
					if (
						response.getMessages().getResultCode() ===
						APIContracts.MessageTypeEnum.OK
					) {
						resolve(response);
					} else {
						reject(
							new Error(
								`Error Code: ${response
									.getMessages()
									.getMessage()[0]
									.getCode()}. Error message: ${response
									.getMessages()
									.getMessage()[0]
									.getText()}`,
							),
						);
					}
				} else {
					reject(new Error("Null response received"));
				}
			});
		});
	}

	async fetchSubscription(
		subscriptionId: string,
	): Promise<pkg.APIContracts.ARBGetSubscriptionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const getRequest = new APIContracts.ARBGetSubscriptionRequest();
		getRequest.setMerchantAuthentication(merchantAuthenticationType);
		getRequest.setSubscriptionId(subscriptionId);

		return new Promise<pkg.APIContracts.ARBGetSubscriptionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.ARBGetSubscriptionController(
					getRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.ARBGetSubscriptionResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async createAcceptPaymentSubscriptionTransaction(transactionDetails: {
		customerProfileId: string;
		customerPaymentProfileId: string;
		customerAddressId?: string;
		description: string;
		amount: number;
		merchantData: {
			userId: string;
			transactionId: string;
		};
	}): Promise<pkg.APIContracts.CreateTransactionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const profileToCharge = new APIContracts.CustomerProfilePaymentType();
		profileToCharge.setCustomerProfileId(
			transactionDetails.customerProfileId,
		);

		const paymentProfile = new APIContracts.PaymentProfile();
		paymentProfile.setPaymentProfileId(
			transactionDetails.customerPaymentProfileId,
		);
		profileToCharge.setPaymentProfile(paymentProfile);

		const orderDetails = new APIContracts.OrderType();
		orderDetails.setInvoiceNumber(`INV-${new Date().getTime()}`);
		orderDetails.setDescription(
			`${transactionDetails.description} | User ID: ${transactionDetails.merchantData.userId} | Transaction ID: ${transactionDetails.merchantData.transactionId}`,
		);

		const transactionRequestType =
			new APIContracts.TransactionRequestType();
		transactionRequestType.setTransactionType(
			APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION,
		);
		transactionRequestType.setAmount(transactionDetails.amount);
		transactionRequestType.setOrder(orderDetails);
		transactionRequestType.setProfile(profileToCharge);

		const createRequest = new APIContracts.CreateTransactionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setTransactionRequest(transactionRequestType);

		return new Promise<pkg.APIContracts.CreateTransactionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.CreateTransactionController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response = new APIContracts.CreateTransactionResponse(
						apiResponse,
					);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async createSubscription(subscriptionDetails: {
		description: string;
		amount: number;
		trialAmount?: number;
		customerProfileId: string;
		customerPaymentProfileId: string;
		customerAddressId?: string;
		merchantData: {
			userId: string;
			transactionId: string;
		};
		schedule: {
			startDate: Date;
			totalOccurrences: number;
			totalTrialOccurrences?: number;
			intervalLength: number;
		};
	}): Promise<pkg.APIContracts.ARBCreateSubscriptionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const interval = new APIContracts.PaymentScheduleType.Interval();
		interval.setLength(subscriptionDetails.schedule.intervalLength);
		interval.setUnit(APIContracts.ARBSubscriptionUnitEnum.MONTHS);

		const paymentScheduleType = new APIContracts.PaymentScheduleType();
		paymentScheduleType.setInterval(interval);
		paymentScheduleType.setStartDate(
			subscriptionDetails.schedule.startDate
				.toISOString()
				.substring(0, 10),
		);
		paymentScheduleType.setTotalOccurrences(
			subscriptionDetails.schedule.totalOccurrences,
		);
		paymentScheduleType.setTrialOccurrences(
			subscriptionDetails.schedule.totalTrialOccurrences || 0,
		);

		const orderDetails = new APIContracts.OrderType();
		orderDetails.setInvoiceNumber(`INV-${new Date().getTime()}`);
		orderDetails.setDescription(
			`${subscriptionDetails.description} | User ID: ${subscriptionDetails.merchantData.userId} | Transaction ID: ${subscriptionDetails.merchantData.transactionId}`,
		);

		const customerProfileIdType = new APIContracts.CustomerProfileIdType();
		customerProfileIdType.setCustomerProfileId(
			subscriptionDetails.customerProfileId,
		);
		customerProfileIdType.setCustomerPaymentProfileId(
			subscriptionDetails.customerPaymentProfileId,
		);
		if (subscriptionDetails.customerAddressId) {
			customerProfileIdType.setCustomerAddressId(
				subscriptionDetails.customerAddressId,
			);
		}

		const arbSubscription = new APIContracts.ARBSubscriptionType();
		arbSubscription.setName(subscriptionDetails.description);
		arbSubscription.setPaymentSchedule(paymentScheduleType);
		arbSubscription.setAmount(subscriptionDetails.amount);
		arbSubscription.setTrialAmount(subscriptionDetails.trialAmount || 0);
		arbSubscription.setOrder(orderDetails);
		arbSubscription.setProfile(customerProfileIdType);

		const createRequest = new APIContracts.ARBCreateSubscriptionRequest();
		createRequest.setMerchantAuthentication(merchantAuthenticationType);
		createRequest.setSubscription(arbSubscription);

		return new Promise<pkg.APIContracts.ARBCreateSubscriptionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.ARBCreateSubscriptionController(
					createRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.ARBCreateSubscriptionResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async updateSubscriptionPaymentProfile(
		subscriptionId: string,
		customerProfileId: string,
		customerPaymentProfileId: string,
	): Promise<pkg.APIContracts.ARBUpdateSubscriptionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const arbSubscriptionType = new APIContracts.ARBSubscriptionType();
		const customerProfileIdType = new APIContracts.CustomerProfileIdType();
		customerProfileIdType.setCustomerProfileId(customerProfileId);
		customerProfileIdType.setCustomerPaymentProfileId(
			customerPaymentProfileId,
		);
		arbSubscriptionType.setProfile(customerProfileIdType);

		const updateRequest = new APIContracts.ARBUpdateSubscriptionRequest();
		updateRequest.setMerchantAuthentication(merchantAuthenticationType);
		updateRequest.setSubscriptionId(subscriptionId);
		updateRequest.setSubscription(arbSubscriptionType);

		return new Promise<pkg.APIContracts.ARBUpdateSubscriptionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.ARBUpdateSubscriptionController(
					updateRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.ARBUpdateSubscriptionResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	async cancelSubscription(
		subscriptionId: string,
	): Promise<pkg.APIContracts.ARBCancelSubscriptionResponse> {
		const merchantAuthenticationType =
			new APIContracts.MerchantAuthenticationType();
		merchantAuthenticationType.setName(this.#apiLoginKey);
		merchantAuthenticationType.setTransactionKey(this.#transactionKey);

		const cancelRequest = new APIContracts.ARBCancelSubscriptionRequest();
		cancelRequest.setMerchantAuthentication(merchantAuthenticationType);
		cancelRequest.setSubscriptionId(subscriptionId);

		return new Promise<pkg.APIContracts.ARBCancelSubscriptionResponse>(
			(resolve, reject) => {
				const ctrl = new APIControllers.ARBCancelSubscriptionController(
					cancelRequest.getJSON(),
				);
				ctrl.setEnvironment(this.environment);
				ctrl.execute(() => {
					const apiResponse = ctrl.getResponse();
					const response =
						new APIContracts.ARBCancelSubscriptionResponse(
							apiResponse,
						);

					if (!response) {
						reject(new Error("No response received."));
						return;
					}

					resolve(response);
				});
			},
		);
	}

	verifyWebhookEvent(data: {
		headers: { "x-anet-signature": string };
		rawBody: Buffer;
	}) {
		const computedHash = createHmac("sha512", this.signatureKey)
			.update(data.rawBody)
			.digest("hex");

		const incomingHash = data.headers["x-anet-signature"].split("=")[1];

		if (computedHash.toUpperCase() !== incomingHash) {
			throw new Error(
				"Hashes do not match. Webhook notification rejected.",
			);
		}

		return true;
	}
}

export async function authorizeNetFactory(): Promise<AuthorizeNetService> {
	if (
		!process.env.AUTHORIZE_NET_ENVIRONMENT ||
		!process.env.AUTHORIZE_NET_API_LOGIN_KEY ||
		!process.env.AUTHORIZE_NET_TRANSACTION_KEY ||
		!process.env.AUTHORIZE_NET_WEBHOOK_SECRET
	) {
		throw new Error(
			"Missing API login key or transaction key for Authorize.net",
		);
	}

	const environment = process.env.AUTHORIZE_NET_ENVIRONMENT;
	const apiLoginKey = process.env.AUTHORIZE_NET_API_LOGIN_KEY;
	const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
	const signatureKey = process.env.AUTHORIZE_NET_WEBHOOK_SECRET;
	return new AuthorizeNetService(
		environment,
		apiLoginKey,
		transactionKey,
		signatureKey,
	);
}

export default AuthorizeNetService;
