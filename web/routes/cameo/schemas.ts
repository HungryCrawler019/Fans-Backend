import { CameoContentType } from "@prisma/client";

export interface CameoProfileDuration {
	length: number;
	price: number;
	currency: string;
}

export interface CameoProfile {
	description: string;
	sexualContentEnabled: boolean;
	contentTypes: (typeof CameoContentType)[keyof typeof CameoContentType][];
	customContentType: string;
	isAvailable: boolean;
	customVideoDurations: CameoProfileDuration[];
}
