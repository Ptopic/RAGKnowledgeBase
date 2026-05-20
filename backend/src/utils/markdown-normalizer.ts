/** Marks a blank-paragraph separator in stored markdown. Full pattern: `\n\n{PB}` — frontend detects this to render visual paragraph gaps. */
export const PARAGRAPH_BREAK_TOKEN = "{PB}";

function stripTrailingWhitespacePreserveBreaks(text: string): string {
	return text.replace(/[ \t]+$/gm, (trailing) =>
		trailing.length >= 2 ? "  " : "",
	);
}

/** Generic normalization for all content types. Collapses triple+ newlines to `\n\n` (no token injection). */
export function normalizeMarkdownForChunking(content: string): string {
	if (!content) {
		return "";
	}

	return stripTrailingWhitespacePreserveBreaks(content)
		.replace(/\r\n?/g, "\n")
		.replace(/\n[ \t]+\n/g, "\n\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** Notebook-specific: converts triple+ newlines to paragraph break tokens for blank-paragraph visual separation in the UI. */
export function injectParagraphBreakTokens(content: string): string {
	return content.replace(/\n{3,}/g, "\n\n" + PARAGRAPH_BREAK_TOKEN);
}

/** Lighter post-split cleanup that preserves already-injected paragraph break tokens without re-scanning for triple newlines. */
export function normalizeChunkAfterSplit(content: string): string {
	if (!content) {
		return "";
	}

	return stripTrailingWhitespacePreserveBreaks(content)
		.replace(/\r\n?/g, "\n")
		.replace(/\n[ \t]+\n/g, "\n\n")
		.trim();
}
