import { IRole } from "../../CommonAPISchemas.js";

export interface RoleCreateReqBody {
	name: string;
	color: string;
	icon?: string;
	customIcon?: string;
	level: number;
}

export interface RoleUpdateReqBody {
	name?: string;
	color?: string;
	icon?: string;
	customIcon?: string;
	level?: number;
}

export type RoleRespBody = IRole & { fans?: number };

export interface RolesRespBody {
	roles: RoleRespBody[];
}
