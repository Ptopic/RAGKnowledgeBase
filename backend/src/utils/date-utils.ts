/**
 * Date utility functions
 */

/**
 * Convert Date object or string to YYYY-MM-DD format
 * @param date - Date object, string, or undefined
 * @returns String in YYYY-MM-DD format or undefined if no date provided
 */
export function toDateString(date?: Date | string): string | undefined {
	if (!date) return undefined;
	if (typeof date === "string") return date;
	return date.toISOString().split("T")[0];
}
