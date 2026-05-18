/**
 * Strip HTML tags and decode HTML entities from content.
 * Used to convert rich text editor output (BlockNote) to plain text for RAG indexing.
 *
 * Key behaviors:
 * - Removes ALL HTML tag attributes (style, class, id, etc.)
 * - Replaces block-level elements with newlines
 * - Extracts <img> tags and replaces them with "Image: {url}" placeholders
 *   so image analysis can later replace them with descriptions
 * - Decodes HTML entities
 * - Collapses excessive whitespace
 */

export interface ImagePlaceholder {
	index: number;
	url: string;
	altText?: string;
}

/**
 * Strip HTML while extracting image URLs as placeholders.
 * Returns plain text with "Image: {url}" where <img> tags appeared,
 * plus a list of extracted image candidates for later vision analysis.
 */
export function stripHtmlAndExtractImages(html: string): {
	plainText: string;
	images: ImagePlaceholder[];
} {
	if (!html) return { plainText: "", images: [] };

	const images: ImagePlaceholder[] = [];
	let imageIndex = 0;

	// Extract <img> tags BEFORE stripping, replace with numbered placeholders
	const withPlaceholders = html.replace(/<img[^>]*>/gi, (match) => {
		const srcMatch = match.match(/src=["']([^"']+)["']/i);
		const altMatch = match.match(/alt=["']([^"']*)["']/i);
		const url = srcMatch?.[1]?.trim() || "";
		const altText = altMatch?.[1]?.trim() || undefined;

		if (!url) return "";

		const idx = imageIndex++;
		images.push({ index: idx, url, altText });
		return `Image: ${url}`;
	});

	const plainText = stripHtml(withPlaceholders);
	return { plainText, images };
}

/**
 * Strip HTML tags and decode HTML entities from content.
 * Removes ALL attributes from HTML tags — only the tag name and text content survive.
 */
export function stripHtml(html: string): string {
	if (!html) return "";

	return (
		html
			// Remove ALL attributes from opening tags, keeping only the tag name
			// e.g. <div style="..." class="..."> becomes <div>
			.replace(/<(\w+)\s+[^>]*>/g, "<$1>")

			// Replace block-level elements with newlines
			.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote)[^>]*>/gi, "\n")

			// Replace <hr> with a separator
			.replace(/<hr[^>]*>/gi, "\n---\n")

			// Remove all remaining HTML tags (now without attributes)
			.replace(/<[^>]+>/g, "")

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
