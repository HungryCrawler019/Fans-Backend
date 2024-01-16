import { IBundle } from "../../../../CommonAPISchemas.js";

export interface BundleCreateBody {
	title?: string;
	month: number;
	discount: number;
	limit?: number;
	roles?: string[];
}
export interface BundleUpdateBody {
	title?: string;
	month?: number;
	discount?: number;
	limit?: number;
}

export type BundleRespBody = IBundle;
