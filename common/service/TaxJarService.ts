import { Injectable, Injector } from "async-injection";
import { Logger } from "pino";
import Taxjar from "taxjar";
import { TaxParams } from "taxjar/dist/types/paramTypes.js";
import { TaxForOrderRes } from "taxjar/dist/types/returnTypes.js";
import states from "../../constants/data/states.js";

@Injectable()
class TaxJarService {
	client: Taxjar | undefined;

	constructor(apiKey: string) {
		if (apiKey.length) {
			this.client = new Taxjar({
				apiKey: apiKey,
			});
		}
	}

	#assertClient(): asserts this is this & { client: Taxjar } {
		if (!this.client) {
			throw new Error("TaxJar client is not configured.");
		}
	}

	async calculateTax(orderDetails: TaxParams): Promise<TaxForOrderRes> {
		this.#assertClient();

		const stateCode = states.find(
			(state) => state.name === orderDetails.to_state,
		)?.isoCode;

		return this.client.taxForOrder({
			from_country: orderDetails.from_country,
			from_zip: orderDetails.from_zip,
			from_state: orderDetails.from_state,
			from_city: orderDetails.from_city,
			from_street: orderDetails.from_street,
			to_country: orderDetails.to_country,
			to_zip: orderDetails.to_zip,
			to_state: stateCode,
			to_city: orderDetails.to_city,
			to_street: orderDetails.to_street,
			amount: orderDetails.amount,
			shipping: orderDetails.shipping,
			customer_id: orderDetails.customer_id,
			exemption_type: orderDetails.exemption_type,
			nexus_addresses: orderDetails.nexus_addresses,
			line_items: orderDetails.line_items,
		});
	}
}

export async function taxJarFactory(
	injector: Injector,
): Promise<TaxJarService> {
	const logger = await injector.resolve<Logger>("logger");
	const apiKey = process.env.TAXJAR_API_KEY;
	if (!apiKey) {
		logger.warn("TaxJar API key is not set. Integration is disabled.");
	}

	return new TaxJarService(apiKey || "");
}

export default TaxJarService;
