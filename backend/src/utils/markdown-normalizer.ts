/**
 * Normalize markdown/text before chunking to reduce token waste from noisy spacing.
 */
export function normalizeMarkdownForChunking(content: string): string {
	if (!content) {
		return "";
	}

	return content
		.replace(/\r\n?/g, "\n") // normalize line endings
		.replace(/[ \t]+$/gm, "") // trim trailing whitespace per line
		.replace(/\n[ \t]+\n/g, "\n\n") // normalize whitespace-only lines
		.replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
		.trim();
}
