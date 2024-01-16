import { Injectable } from "async-injection";
import dinero, { Dinero } from "dinero.js";

@Injectable()
class GemExchangeService {
	readonly #exchangeRate: number;

	constructor(exchangeRate: number) {
		this.#exchangeRate = exchangeRate * 100;
	}

	get exchangeRate(): number {
		return this.#exchangeRate;
	}

	gemExchange(gems: number): Dinero {
		const gemsDinero = dinero({ amount: gems });
		return gemsDinero.multiply(this.#exchangeRate);
	}

	gemExchangeBack(cents: number): Dinero {
		const centsDinero = dinero({ amount: cents });
		return centsDinero.divide(this.#exchangeRate);
	}
}

export async function gemExchangeFactory(): Promise<GemExchangeService> {
	if (!process.env.GEM_EXCHANGE_RATE) {
		throw new Error("Missing GEM_EXCHANGE_RATE environment variable");
	}

	const exchangeRate = Number(process.env.GEM_EXCHANGE_RATE);

	return new GemExchangeService(exchangeRate);
}

export default GemExchangeService;
