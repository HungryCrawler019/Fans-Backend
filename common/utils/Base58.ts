import { makeBaseNEncoderDecoder } from "./BaseN.js";

const base58Codec = makeBaseNEncoderDecoder(
	"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
);

export const encodeBase58 = (input: Uint8Array) => base58Codec.encode(input);

export const decodeBase58 = (input: string) => base58Codec.decode(input);

export const encodeBase58Buffer = (input: Buffer) => base58Codec.encode(input);

export const decodeBase58Buffer = (input: string) =>
	Buffer.from(base58Codec.decode(input));
