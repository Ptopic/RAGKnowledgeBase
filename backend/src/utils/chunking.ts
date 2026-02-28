import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { normalizeMarkdownForChunking } from "./markdown-normalizer";

export type ChunkingSourceType = "generic" | "web" | "youtube";

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
		// Keep timestamp and sentence on same line where possible.
		text = text.replace(/(\d{1,2}:\d{2}(?::\d{2})?)\n+/g, "$1 ");
	}

	if (source === "web") {
		// Remove excessive nav/footer-like spacing noise.
		text = text.replace(/\n{3,}/g, "\n\n");
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
		.map((chunk) => normalizeMarkdownForChunking(chunk))
		.filter((chunk) => chunk.length >= DEFAULT_MIN_CHARS);
}
