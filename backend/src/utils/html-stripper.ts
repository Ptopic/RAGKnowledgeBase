/**
 * Strip HTML tags and decode HTML entities from content.
 * Used to convert rich text editor output (BlockNote) to plain text for RAG indexing.
 *
 * Key behaviors:
 * - Removes ALL HTML tag attributes (style, class, id, etc.)
 * - Handles attributes containing > inside quoted values without breaking
 * - Replaces block-level elements with newlines
 * - Extracts <img> tag URLs into a separate array for vision analysis
 *   (images are NOT included in the plain text output)
 * - Decodes HTML entities
 * - Collapses excessive whitespace
 */

export interface ImagePlaceholder {
	index: number;
	url: string;
	altText?: string;
}

/**
 * Strip HTML while extracting image URLs for separate vision analysis.
 * Returns clean plain text (without any image placeholders or URLs)
 * plus a list of extracted image candidates for <image_chunk> processing.
 */
export function stripHtmlAndExtractImages(html: string): {
	plainText: string;
	images: ImagePlaceholder[];
} {
	if (!html) return { plainText: "", images: [] };

	const images: ImagePlaceholder[] = [];
	let imageIndex = 0;

	const withoutImages = html.replace(/<img\s+(?:[^>"']*|"[^"]*"|'[^']*')*\s*\/?>/gi, (match) => {
		const srcMatch = match.match(/src=["']([^"']+)["']/i);
		const altMatch = match.match(/alt=["']([^"']*)["']/i);
		const url = srcMatch?.[1]?.trim() || "";
		const altText = altMatch?.[1]?.trim() || undefined;

		if (!url) return "";

		images.push({ index: imageIndex++, url, altText });
		return "";
	});

	const plainText = stripHtml(withoutImages);
	return { plainText, images };
}

/**
 * Strip HTML tags and decode HTML entities from content.
 * Removes ALL attributes from HTML tags — only the tag name and text content survive.
 *
 * Uses a quote-aware regex to handle attribute values containing > characters
 * (e.g., onclick="if(a>b)" or data-content="x > y") without breaking the match.
 */
export function stripHtml(html: string): string {
	if (!html) return "";

	return (
		html
			// Quote-aware: handles attributes with > inside quoted values, e.g. style="x > y"
			.replace(/<(\w+)(?:\s+(?:[^>"']*|"[^"]*"|'[^']*'))*\s*\/?>/g, "<$1>")

			// Replace block-level elements with newlines
			.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote)>/gi, "\n")

			// Replace <hr> with a separator
			.replace(/<hr\s*\/?>/gi, "\n---\n")

			.replace(/<\/?\w+\s*\/?>/g, "")

			// Decode common HTML entities
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, " ")
			.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

			// Collapse excessive newlines
			.replace(/\n{3,}/g, "\n\n")

			// Trim each line
			.split("\n")
			.map((line) => line.trim())
			.filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
			.join("\n")
			.trim()
	);
}
