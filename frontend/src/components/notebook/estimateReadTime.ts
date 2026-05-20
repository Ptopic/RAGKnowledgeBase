const WORDS_PER_MINUTE = 200;

export function estimateReadTime(content: string): number {
	const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
	const wordCount = text ? text.split(" ").filter(Boolean).length : 0;
	const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
	return Math.max(1, minutes);
}
