// This file is supposed to be synced between frontend and backend
// frontend: helper/endpoints/categories/schemas.ts
// backend: web/routes/categories/schemas.ts

import { ICategory, IRole } from "../../CommonAPISchemas.js";

export interface SendMessageReqBody {
	name: string;
	email: string;
	subject: string;
	question: string;
}

export type CategoryRespBody = ICategory & { roles: IRole[] };

export interface CategoriesRespBody {
	categories: ICategory[];
	page: number;
	size: number;
	total: number;
}
