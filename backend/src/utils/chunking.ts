import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
	normalizeMarkdownForChunking,
	normalizeChunkAfterSplit,
	injectParagraphBreakTokens,
	PARAGRAPH_BREAK_TOKEN,
} from "./markdown-normalizer";

export type ChunkingSourceType = "generic" | "web" | "youtube" | "notebook";

interface MarkdownSplitterOptions {
	chunkSize?: number;
	chunkOverlap?: number;
}

const DEFAULT_CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "1000", 10);
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "120", 10);
const DEFAULT_MIN_CHARS = parseInt(process.env.CHUNK_MIN_CHARS || "40", 10);
const CHUNK_STRATEGY = process.env.CHUNK_STRATEGY || "markdown_aware";

export function createMarkdownAwareSplitter(
	options: MarkdownSplitterOptions = {},
): RecursiveCharacterTextSplitter {
	const useMarkdownAware = CHUNK_STRATEGY === "markdown_aware";

	return new RecursiveCharacterTextSplitter({
		chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
		chunkOverlap: options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
		separators: useMarkdownAware
			? [
					"\n## ",
					"\n### ",
					"\n#### ",
					"\n- ",
					"\n* ",
					"\n\n",
					"\n",
					". ",
					" ",
					"",
				]
			: ["\n\n", "\n", ". ", " ", ""],
	});
}

function preprocessMarkdownBySource(
	content: string,
	source: ChunkingSourceType,
): string {
	let text = normalizeMarkdownForChunking(content);

	if (source === "youtube") {
		text = text.replace(/(\d{1,2}:\d{2}(?::\d{2})?)\n+/g, "$1 ");
	}

	if (source === "notebook") {
		text = injectParagraphBreakTokens(text);
	}

	if (source === "web") {
		text = text.replace(/\n{4,}/g, "\n\n\n");
	}

	return text;
}

export async function chunkMarkdownContent(
	content: string,
	splitter: RecursiveCharacterTextSplitter,
	source: ChunkingSourceType = "generic",
): Promise<string[]> {
	const preprocessed = preprocessMarkdownBySource(content, source);
	const chunks = await splitter.splitText(preprocessed);

	return chunks
		.map((chunk) => normalizeChunkAfterSplit(chunk))
		.filter((chunk) => chunk.length >= DEFAULT_MIN_CHARS);
}
