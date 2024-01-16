// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/categories/schemas.ts
// backend: web/routes/categories/schemas.ts

import { ICategory, IPost, IRole } from "../../CommonAPISchemas.js";

export interface CategoryCreateReqBody {
	name: string;
	isActive?: boolean;
	postIds?: string[];
	roleIds?: string[];
}

export interface CategoryUpdateReqBody {
	name?: string;
	isActive?: boolean;
	postIds?: string[];
	roleIds?: string[];
}

export type CategoryRespBody = ICategory & { roles: IRole[]; posts?: IPost[] };

export interface CategoriesRespBody {
	categories: CategoryRespBody[];
	page: number;
	size: number;
	total: number;
}
