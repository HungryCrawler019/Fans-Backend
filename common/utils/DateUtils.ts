/**
 * Converts a Date object to ISO 8601 YYYY-MM-DD format string.
 * The timezone is always UTC.
 *
 * @param date Date object to convert
 */
export function toISODate(date: Date): string {
	const year = date.getUTCFullYear().toString();
	const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = date.getUTCDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}
