export interface IdParams {
	id: string;
}

export interface QueryParams {
	query: string;
}

export interface PageQuery {
	page?: number;
	size?: number;
}

export interface QueryWithPageParams {
	query?: string;
	page?: number;
	size?: number;
}

export interface DateFilterQueryParams {
	from?: string;
	to?: string;
}
