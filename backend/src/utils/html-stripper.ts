/**
 * Strip HTML tags and decode HTML entities from content.
 * Used to convert rich text editor output (BlockNote) to plain text for RAG indexing.
 *
 * Key behaviors:
 * - Removes ALL HTML tag attributes (style, class, id, etc.)
 * - Handles attributes containing > inside quoted values without breaking
 * - Replaces block-level elements with newlines
 * - Converts <img> tags to markdown image references: ![Image N: alt](url)
 * - Extracts image URLs into a separate array for vision analysis
 * - Decodes safe HTML entities but preserves &lt; and &gt; as entities
 *   to prevent them from being reinterpreted as HTML tags by downstream
 *   markdown renderers (react-markdown treats <tag> as raw-HTML blocks
 *   and silently drops them, including any markdown images inside).
 * - Collapses excessive whitespace
 */

export interface ImagePlaceholder {
	index: number;
	url: string;
	altText?: string;
}

/**
 * Strip HTML while converting <img> tags to markdown image references
 * and extracting URLs for separate vision analysis.
 *
 * Returns markdown-like text with inline ![Image N: alt](url) references
 * (matching web article chunk format) plus an images array for <image_chunk> processing.
 */
export function stripHtmlAndExtractImages(html: string): {
	plainText: string;
	images: ImagePlaceholder[];
} {
	if (!html) return { plainText: "", images: [] };

	const images: ImagePlaceholder[] = [];
	let imageIndex = 0;

	const withMarkdownImages = html.replace(/<img\s+(?:[^>"']*|"[^"]*"|'[^']*')*\s*\/?>/gi, (match) => {
		const srcMatch = match.match(/src=["']([^"']+)["']/i);
		const altMatch = match.match(/alt=["']([^"']*)["']/i);
		const url = srcMatch?.[1]?.trim() || "";
		const altText = altMatch?.[1]?.trim() || undefined;

		if (!url) return "";

		const idx = imageIndex++;
		images.push({ index: idx, url, altText });

		const alt = altText || `Image ${idx + 1}`;
		return `![Image ${idx + 1}: ${alt}](${url})`;
	});

	const plainText = stripHtml(withMarkdownImages);
	return { plainText, images };
}

/**
 * Strip HTML tags and decode HTML entities from content.
 * Removes ALL attributes from HTML tags — only the tag name and text content survive.
 *
 * Uses a quote-aware regex to handle attribute values containing > characters
 * (e.g., onclick="if(a>b)" or data-content="x > y") without breaking the match.
 *
 * IMPORTANT: &lt; and &gt; are NOT decoded to < and > to prevent
 * downstream markdown renderers (e.g. react-markdown) from treating
 * the resulting text as raw-HTML blocks, which would cause entire
 * sections — including inline ![alt](url) image references — to be
 * silently dropped.
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

			// Decode safe HTML entities.
			// NOTE: &lt; and &gt; are intentionally kept as entities to prevent
			// downstream markdown renderers from misinterpreting them as HTML tags.
			.replace(/&amp;/g, "&")
			// &lt; and &gt; are NOT decoded — see docstring above
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, " ")
			.replace(/&#(\d+);/g, (_, code) => {
				const charCode = Number(code);
				// Keep numeric entities that would produce < or > as entities
				if (charCode === 60 || charCode === 62) return _;
				return String.fromCharCode(charCode);
			})

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
