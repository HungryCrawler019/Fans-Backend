import { randomBytes } from "crypto";

export const choice = <T>(items: T[]): T =>
	items[Math.floor(Math.random() * items.length)];

export const firstParam = (
	param: string[] | string | undefined,
): string | undefined => {
	if (param == undefined) return undefined;

	return Array.isArray(param) ? param[0] : param;
};

/**
 * Split a host string into host and port. Is IPv6 compatible.
 * @param input Host string
 */
export function splitHostPort(
	input: string,
	defaultPort: number,
): [string, number] {
	let host = "";
	let port = defaultPort;
	const ipv6 = input.match(/^\[([0-9a-fA-F:.]+)\](?::(\d+))?$/);
	if (ipv6) {
		host = ipv6[1];
		port = parseInt(ipv6[2] || defaultPort.toString(), 10);
	} else {
		const [hostStr, portStr] = input.split(":");
		host = hostStr;
		port = parseInt(portStr || defaultPort.toString(), 10);
	}

	if (isNaN(port)) {
		port = defaultPort;
	}

	return [host, port];
}

/**
 * Generates a random alphanumeric code with specified alphabet and length.
 * @param length Length of the code. Must be greater than 0.
 * @param alphabet Alphabet to use. Default is "123456789abcdefghjkmnpqrstuvwxyz".
 * @returns Random alphanumeric code.
 */
export function randomAlphaNumCode(
	length: number,
	alphabet: string = "123456789abcdefghjkmnpqrstuvwxyz",
) {
	if (length <= 0) {
		throw new Error("Length must be greater than 0");
	}

	const random = randomBytes(length);
	let result = "";
	for (let i = 0; i < length; i++) {
		result += alphabet[random[i] % alphabet.length];
	}
	return result;
}
