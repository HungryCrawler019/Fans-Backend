import { UserType } from "@prisma/client";
import { IProfile, IUser } from "../../CommonAPISchemas.js";

export interface UserSearchPageQuery {
	page?: number;
	size?: number;
	query?: string;
	type?: UserType;
}

export type UserRespBody = IUser;

export interface UsersRespBody {
	users: (IUser & { profile?: IProfile })[];
	page: number;
	size: number;
	total: number;
}
