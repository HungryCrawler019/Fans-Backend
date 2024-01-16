import { IApplication } from "../../CommonAPISchemas.js";

export type AppIdParam = {
	appId: string;
};

export type AppIdAndIdParam = {
	appId: string;
	id: string;
};

export type ApplicationCreateReqBody = {
	name: string;
};

export type CreateWebhookReqBody = {
	appId: string;
	target: string;
};

export type IconCreateReqBody = {
	appId: string;
	icon: string;
};

export interface ApplicationUpdateReqBody {
	name: string;
}

export type GetApplicationRespBody = IApplication;

export interface GetApplicationsRespBody {
	applications: IApplication[];
}
