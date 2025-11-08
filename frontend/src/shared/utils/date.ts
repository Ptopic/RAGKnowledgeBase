/**
 * Formats a date string into a readable format
 * @param dateString - The date string to format
 * @returns Formatted date string (e.g., "Jan 1, 2023")
 */
export const formatDateString = (
	dateString: string | null | undefined,
): string => {
	// Handle null/undefined values
	console.log(dateString);
	if (!dateString) {
		return "No date";
	}

	// Replace space with 'T' for proper ISO 8601 format parsing
	const normalizedDate = dateString.replace(" ", "T");
	const date = new Date(normalizedDate);

	// Check if date is valid
	if (Number.isNaN(date.getTime())) {
		return "Invalid date";
	}

	return date.toLocaleDateString("en-GB", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};
