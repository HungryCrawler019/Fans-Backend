import { randomBytes } from "node:crypto";

/**
 * Generates a secure random numeric string with given number of digits.
 * @param length Length of the string to generate.
 * @returns {string} Random numeric string.
 */
export function genOTP(length: number): string {
	const random = randomBytes(length);
	return random.map((b) => b % 10).join("");
}
