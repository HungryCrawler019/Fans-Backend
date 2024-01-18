import { IProfile, IUserlist } from "../../CommonAPISchemas.js";

export interface UserlistCreateReqBody {
	title: string;
	creators: string[];
}

export interface UserlistUpdateReqBody {
	title?: string;
	enabled?: boolean;
	creators?: string[];
}

export type UserlistRespBody = IUserlist & {
	creators: IProfile[];
};

export interface UserlistsRespBody {
	userlists: UserlistRespBody[];
	page: number;
	size: number;
	total: number;
}

export interface AddCreatorReqBody {
	creatorId: string;
}
