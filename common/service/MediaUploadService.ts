import { Injectable, Injector } from "async-injection";
import multer from "fastify-multer";
import S3Storage from "../utils/FastifyMulterS3.js";
import S3Service from "./S3Service.js";
import SnowflakeService from "./SnowflakeService.js";
import { randomFillSync } from "node:crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	GetObjectCommandOutput,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import sharp from "sharp";
import { encode } from "blurhash";

type Multer = ReturnType<typeof multer>;

@Injectable()
class MediaUploadService {
	readonly #snowflake: SnowflakeService;
	readonly #s3: S3Service;
	readonly #bucket: string;
	readonly #maxFileSizeLimit: number;
	readonly #multers: Map<string, Multer>;

	constructor(
		snowflake: SnowflakeService,
		s3: S3Service,
		bucket: string,
		maxFileSizeLimit: number,
	) {
		this.#snowflake = snowflake;
		this.#s3 = s3;
		this.#bucket = bucket;
		this.#multers = new Map();
		this.#maxFileSizeLimit = maxFileSizeLimit;
	}

	/**
	 * Returns and caches a multer instance for the given path. Subsequent calls will return the same instance.
	 * @param name name of the directory to upload to
	 * @returns a Multer instance
	 */
	getMulter(name: string): Multer {
		if (this.#multers.has(name)) {
			return this.#multers.get(name)!;
		}

		const upload = this.createMulter(name);
		this.#multers.set(name, upload);

		return upload;
	}

	/**
	 * Returns a multer instance that doesn't get cached in internal map. Subsequent calls will return a new instance.
	 * @param name name of the directory to upload to
	 * @returns a Multer instance
	 */
	createMulter(name: string): Multer {
		return multer({
			limits: {
				fileSize: this.#maxFileSizeLimit,
			},
			storage: new S3Storage({
				s3: this.#s3,
				bucket: this.#bucket,
				destination: `${name}/`,
				filename: (req, file, cb) => {
					cb(null, this.#createFileId());
				},
			}),
		});
	}

	/**
	 * Returns an unique file id with extension based on the given file name.
	 */
	#createFileId(): string {
		const id = this.#snowflake.gen();
		const buffer = Buffer.alloc(32);
		buffer.writeBigUInt64LE(id);
		randomFillSync(buffer, 8, 24);

		const name = buffer.toString("base64url");
		return name;
	}

	async deleteFile(key: string): Promise<void> {
		const command = new DeleteObjectCommand({
			Bucket: this.#bucket,
			Key: key,
		});
		await this.#s3.send(command);
	}

	async generatePutPresignedUrl(
		folder: string,
		protect: boolean,
	): Promise<{ key: string; presignedUrl: string }> {
		const name = this.#createFileId();
		const path = `${folder}/${name}`;
		const command = new PutObjectCommand({
			Bucket: this.#bucket,
			Key: path,
			ACL: protect ? "private" : "public-read",
		});
		const presignedUrl = await getSignedUrl(this.#s3, command, {
			expiresIn: 3600,
		});

		return {
			key: path,
			presignedUrl,
		};
	}

	async generateGetPresignedUrl(key: string): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: this.#bucket,
			Key: key,
		});
		const presignedUrl = await getSignedUrl(this.#s3, command, {
			expiresIn: 3600,
		});

		return presignedUrl;
	}

	async generateBlurhash(key: string): Promise<string | undefined> {
		const imageBuffer = await this.getImageBuffer(key);
		const rawImageData = await sharp(imageBuffer)
			.raw()
			.ensureAlpha()
			.toBuffer();
		const metadata = await sharp(imageBuffer).metadata();
		if (metadata.width && metadata.height) {
			return encode(
				new Uint8ClampedArray(rawImageData.buffer),
				metadata.width,
				metadata.height,
				4,
				4,
			);
		}
		return undefined;
	}

	private async getImageBuffer(key: string): Promise<Buffer> {
		const command = new GetObjectCommand({
			Bucket: this.#bucket,
			Key: key,
		});
		const response = await this.#s3.send(command);
		return await this.asBuffer(response);
	}

	private asStream(response: GetObjectCommandOutput): Readable {
		return response.Body as Readable;
	}

	private async asBuffer(response: GetObjectCommandOutput) {
		const stream = this.asStream(response);
		const chunks: Buffer[] = [];
		return new Promise<Buffer>((resolve, reject) => {
			stream.on("data", (chunk) => chunks.push(chunk));
			stream.on("error", (err) => reject(err));
			stream.on("end", () => resolve(Buffer.concat(chunks)));
		});
	}

	private async asString(response: GetObjectCommandOutput) {
		const buffer = await this.asBuffer(response);
		return buffer.toString();
	}
}

export async function mediaUploadFactory(
	injector: Injector,
): Promise<MediaUploadService> {
	const s3 = await injector.resolve(S3Service);
	const snowflake = await injector.resolve(SnowflakeService);

	const bucket = process.env.S3_BUCKET;
	if (!bucket) throw new Error("S3_BUCKET is not set");

	const maxFileSizeLimit = process.env.MAX_FILE_SIZE_LIMIT;
	if (!maxFileSizeLimit) throw new Error("MAX_FILE_SIZE_LIMIT is not set");

	const mediaCDN = new MediaUploadService(
		snowflake,
		s3,
		bucket,
		parseInt(maxFileSizeLimit),
	);

	return mediaCDN;
}

export default MediaUploadService;
