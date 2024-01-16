import {
	PaidPost,
	Post,
	PostMedia,
	Upload,
	UploadStorageType,
} from "@prisma/client";
import { Logger } from "pino";
import CloudflareStreamService from "../../common/service/CloudflareStreamService.js";
import MediaUploadService from "../../common/service/MediaUploadService.js";

export async function deleteUploadFromCDN(
	upload: Upload,
	cloudflareStream: CloudflareStreamService,
	mediaUpload: MediaUploadService,
	logger?: Logger,
) {
	if (
		upload.storage === UploadStorageType.S3 &&
		!upload.url.startsWith("https://")
	) {
		await mediaUpload.deleteFile(upload.url).catch((e) => {
			logger?.warn("Failed to delete file", e);
		});
	} else if (upload.storage === UploadStorageType.CLOUDFLARE_STREAM) {
		await cloudflareStream.deleteVideo(upload.url).catch((e) => {
			logger?.warn("Failed to delete video", e);
		});
	}
}

export async function resolveAuthenticatedMediaURL(
	upload: Upload,
	cloudflareStream: CloudflareStreamService,
	_mediaUpload: MediaUploadService,
): Promise<string> {
	let url = upload.url;
	if (upload.storage === UploadStorageType.CLOUDFLARE_STREAM) {
		url = cloudflareStream.getSignedVideoUrl(upload.url);
	}
	// TODO: We're using Cloudflare R2 as our S3 provider, which doesn't support ACLs on objects.
	// So it's pretty pointless to use presigned URLs for now.

	// else if (
	// 	upload.storage === UploadStorageType.S3 &&
	// 	!upload.url.startsWith("https://")
	// ) {
	// 	url = await mediaUpload.generateGetPresignedUrl(upload.url);
	// }
	return url;
}

export async function resolveURLsUpload(
	upload: Upload,
	cloudflareStream: CloudflareStreamService,
	mediaUpload: MediaUploadService,
) {
	upload.url = await resolveAuthenticatedMediaURL(
		upload,
		cloudflareStream,
		mediaUpload,
	);
}

export async function resolveURLsUploads(
	uploads: Upload[],
	cloudflareStream: CloudflareStreamService,
	mediaUpload: MediaUploadService,
) {
	await Promise.all(
		uploads.map((upload) =>
			resolveURLsUpload(upload, cloudflareStream, mediaUpload),
		),
	);
}

interface PostMediaWithUpload extends PostMedia {
	upload?: Upload | null;
}

interface SomethingWithThumbMedia {
	thumbMedia?: Upload | null;
}

interface PostWithMediaLike {
	postMedias?: PostMediaWithUpload[] | null;
	thumbMedia?: Upload | null;
	paidPost?: SomethingWithThumbMedia | null | any;
}

export async function resolveURLsPostLike(
	post: PostWithMediaLike,
	cloudflareStream: CloudflareStreamService,
	mediaUpload: MediaUploadService,
) {
	if (post.thumbMedia) {
		await resolveURLsUpload(post.thumbMedia, cloudflareStream, mediaUpload);
	}

	if (post.postMedias) {
		await resolveURLsUploads(
			post.postMedias.filter((pm) => !!pm.upload).map((pm) => pm.upload!),
			cloudflareStream,
			mediaUpload,
		);
	}

	if (post.paidPost?.thumbMedia) {
		await resolveURLsUpload(
			post.paidPost.thumbMedia,
			cloudflareStream,
			mediaUpload,
		);
	}
}
