import type { EditorBlock } from "./config";
import { generateBlockId, NOTEBOOK_BLOCK_CONFIG } from "./config";

export function blocksToMarkdown(blocks: EditorBlock[]): string {
	return blocks
		.map((block) => {
			const config = NOTEBOOK_BLOCK_CONFIG.find((c) => c.type === block.type);
			const paragraphConfig = { markdownPrefix: "" };

			const entry = config || paragraphConfig;
			const prefix = entry.markdownPrefix;

			if (block.type === "divider") return "---";
			if (block.type === "code") return `\`\`\`\n${block.content}\n\`\`\``;
			return `${prefix}${block.content}`;
		})
		.join("\n\n");
}

export function markdownToBlocks(markdown: string): EditorBlock[] {
	if (!markdown || !markdown.trim()) {
		return [{ id: generateBlockId(), type: "paragraph", content: "" }];
	}

	const lines = markdown.split("\n");
	const blocks: EditorBlock[] = [];
	let inCodeBlock = false;
	let codeContent = "";

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (line.startsWith("```") && !inCodeBlock) {
			inCodeBlock = true;
			codeContent = "";
			continue;
		}
		if (line.startsWith("```") && inCodeBlock) {
			inCodeBlock = false;
			blocks.push({ id: generateBlockId(), type: "code", content: codeContent.replace(/\n$/, "") });
			continue;
		}
		if (inCodeBlock) {
			codeContent += (codeContent ? "\n" : "") + line;
			continue;
		}

		if (line.match(/^### /)) {
			blocks.push({ id: generateBlockId(), type: "h3", content: line.replace(/^### /, "") });
		} else if (line.match(/^## /)) {
			blocks.push({ id: generateBlockId(), type: "h2", content: line.replace(/^## /, "") });
		} else if (line.match(/^# /)) {
			blocks.push({ id: generateBlockId(), type: "h1", content: line.replace(/^# /, "") });
		} else if (line === "---") {
			blocks.push({ id: generateBlockId(), type: "divider", content: "" });
		} else if (line.match(/^> /)) {
			blocks.push({ id: generateBlockId(), type: "quote", content: line.replace(/^> /, "") });
		} else if (line.match(/^- /)) {
			blocks.push({ id: generateBlockId(), type: "bullet", content: line.replace(/^- /, "") });
		} else if (line.match(/^1\. /)) {
			blocks.push({ id: generateBlockId(), type: "number", content: line.replace(/^1\. /, "") });
		} else if (line.trim()) {
			blocks.push({ id: generateBlockId(), type: "paragraph", content: line });
		}
	}

	if (blocks.length === 0) {
		blocks.push({ id: generateBlockId(), type: "paragraph", content: "" });
	}

	return blocks;
}
