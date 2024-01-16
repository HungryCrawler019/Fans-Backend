import { CameoContentType } from "@prisma/client";

export interface CameoSettings {
	volumeLimit: {
		unit: "Daily" | "Weekly" | "Monthly";
		amount: number | null;
	};
	fulfillmentTime: number | null; // hours
	description: string;
	sexualContentEnabled: boolean;
	contentTypes: (typeof CameoContentType)[keyof typeof CameoContentType][];
	customContentType: string;
	agreedToTerms: boolean;
	notificationNewRequests: boolean;
	notificationPendingVideos: boolean;
	notificationCompletedRequests: boolean;
	notificationsByEmail: boolean;
	notificationsByPhone: boolean;
	customVideoEnabled: boolean;
}

export type UpdateCameoSettings = Partial<CameoSettings>;
