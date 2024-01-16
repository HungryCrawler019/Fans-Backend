import type { UploadType } from "@prisma/client";
import { IMedia, IUpload } from "../../CommonAPISchemas.js";

export interface MediaUploadReqBody {
	type: string;
}

export interface MediaUploadRespBody {
	paths: string[];
}

export interface MediaTypeParam {
	type: UploadType;
}

export type MediaRespBody = IMedia;

export interface MediasRespBody {
	medias: IMedia[];
	page: number;
	size: number;
	total: number;
	videoTotal?: number;
	imageTotal?: number;
	hasAccess: boolean;
}

export interface GeneratePresignedUrlReqBody {
	origin?: string;
	usage?: string;
}

export interface PresignedUrlRespBody extends IUpload {
	presignedUrl: string;
}

export interface TusUploadReqBody {
	usage?: string;
}

export interface TusUploadRespBody extends IUpload {
	uploadUrl: string;
}

export interface FinishUploadReqBody {
	isSuccess: boolean;
}

export interface PostMediaPageQuery {
	type?: UploadType;
	page?: number;
	size?: number;
}
