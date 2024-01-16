export const DEFAULT_PAGE_SIZE = 6;

export const isOutOfRange = (page: number, size: number, total: number) =>
	page < 1 || size < 1 || (total > 0 && (page - 1) * size >= total);

export type PaginatedQuery<T> = T & {
	page?: number;
	size?: number;
};
