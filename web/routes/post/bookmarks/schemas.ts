import { IBookmark, IPost, PostType } from "../../../CommonAPISchemas.js";

export interface BookmarksRespBody {
	bookmarks: (IBookmark & { post?: IPost })[];
	page: number;
	size: number;
	total: number;
}

export interface BookmarkIdsRespBody {
	updatedPost: IPost;
}

export interface BookmarksFilterQuery {
	query?: string;
	type?: PostType;
	page?: number;
	size?: number;
}
