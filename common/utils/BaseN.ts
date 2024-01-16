// https://github.com/daangn/urlpack/tree/main/packages/base-codec

interface BaseNEncoderDecoder {
	encode(input: Uint8Array): string;
	decode(input: string): Uint8Array;
}

export function makeBaseNEncoderDecoder(
	baseAlphabet: string,
): BaseNEncoderDecoder {
	const n = baseAlphabet.length;
	if (n === 0 || n > 255) {
		throw new Error("Invalid base alphabet length: " + n);
	}

	const map = new Map(Array.from(baseAlphabet, (char, i) => [char, i]));

	return {
		encode: (input) => {
			// encoding_flag:
			//  - 0: counting leading zeros
			//  - 1: processing
			let flag = 0;
			let leadingZeros = 0;
			const encoding = [];

			for (const byte of input) {
				if (!(flag || byte)) {
					leadingZeros++;
				} else {
					flag = 1;
				}

				let carry = byte;
				for (let i = 0; carry || i < encoding.length; i++) {
					carry += encoding[i] << 8;
					encoding[i] = carry % n;
					carry = (carry / n) | 0;
				}
			}

			const len = leadingZeros + encoding.length;
			const values = Array(len);
			for (let i = 0; i < len; i++) {
				values[i] =
					baseAlphabet[i < leadingZeros ? 0 : encoding[len - i - 1]];
			}

			return values.join("");
		},
		decode: (input) => {
			// encoding_flag:
			//  - 0: counting leading zeros
			//  - 1: processing
			let flag = 0;
			let leadingZeros = 0;
			const decoding: number[] = [];

			for (const char of input) {
				let carry = map.get(char);
				if (carry == null) {
					throw new Error("Invalid character: " + char);
				}
				if (!(flag || carry)) {
					leadingZeros++;
				} else {
					flag = 1;
				}

				for (let i = 0; carry || i < decoding.length; i++) {
					carry += (decoding[i] * n) >>> 0;
					decoding[i] = carry % 256;
					carry = (carry / 256) | 0;
				}
			}

			const len = leadingZeros + decoding.length;
			const values = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				values[i] = i < leadingZeros ? 0 : decoding[len - i - 1];
			}

			return values;
		},
	};
}
