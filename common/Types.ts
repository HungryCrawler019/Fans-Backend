export type BufferLike =
	| string
	| Buffer
	| DataView
	| number
	| ArrayBufferView
	| Uint8Array
	| ArrayBuffer
	| SharedArrayBuffer
	| ReadonlyArray<any>
	| ReadonlyArray<number>
	| { valueOf(): ArrayBuffer }
	| { valueOf(): SharedArrayBuffer }
	| { valueOf(): Uint8Array }
	| { valueOf(): ReadonlyArray<number> }
	| { valueOf(): string }
	| { [Symbol.toPrimitive](hint: string): string };

export type PrismaJson<T> = T & { [key: string]: any };

export interface JsonMap {
	[member: string]: string | number | boolean | null | JsonArray | JsonMap;
}
export interface JsonArray
	extends Array<string | number | boolean | null | JsonArray | JsonMap> {}
export type Json = JsonMap | JsonArray | string | number | boolean | null;
