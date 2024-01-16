import { IPlayList, IPost, IUpload } from "../../CommonAPISchemas.js";

export interface PlaylistCreateReqBody {
	title: string;
	description?: string;
	thumbId: string;
	isPrivate: boolean;
	posts: string[];
}

export interface PlaylistUpdateReqBody {
	title?: string;
	description?: string;
	thumbId?: string;
	isPrivate?: boolean;
	posts?: string[];
}

export interface PlaylistFilterQuery {
	title?: string;
	page?: number;
	size?: number;
}

export type PlaylistRespBody = IPlayList & {
	posts: IPost[];
	uploads: IUpload[];
};

export interface PlaylistsRespBody {
	playlists: PlaylistRespBody[];
	page: number;
	size: number;
	total: number;
}
