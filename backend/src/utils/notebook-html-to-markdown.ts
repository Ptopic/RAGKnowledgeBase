/**
 * Convert BlockNote notebook HTML to clean markdown for RAG indexing.
 *
 * BlockNote's `blocksToFullHTML` produces editor-internal HTML with
 * resize handles, overlay wrappers, `contenteditable`/`draggable` attrs,
 * and inline styles that are irrelevant for search/indexing.  This utility
 * strips those UI artifacts first, then converts the remaining semantic
 * HTML to markdown using Turndown + GFM plugin.
 *
 * The output is clean markdown suitable for `chunkMarkdownContent()`,
 * matching the format that web-article documents already use (native
 * `![alt](url)` image references, proper headings, lists, etc.).
 */

import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { stripHtmlAndExtractImages } from "./html-stripper";

export interface NotebookToMarkdownResult {
	markdown: string;
	images: { index: number; url: string; altText?: string }[];
}

/**
 * Convert BlockNote notebook HTML to clean markdown for RAG indexing.
 *
 * Falls back to `stripHtmlAndExtractImages` if Turndown conversion fails,
 * so indexing never crashes.
 */
export function notebookHtmlToMarkdown(html: string): NotebookToMarkdownResult {
	const { images } = stripHtmlAndExtractImages(html);

	if (!html || html.trim().length === 0) {
		return { markdown: "", images: [] };
	}

	try {
		const markdown = convertWithTurndown(html);
		return { markdown, images };
	} catch (error) {
		const { plainText } = stripHtmlAndExtractImages(html);
		throw Object.assign(
			new Error(
				`Turndown conversion failed, falling back to stripHtml: ${error instanceof Error ? error.message : String(error)}`,
			),
			{ fallbackMarkdown: plainText, images },
		);
	}
}

/**
 * Strip BlockNote editor UI artifacts from HTML before Turndown conversion.
 *
 * Uses regex (no DOM parser) because the backend runs in Node.js and the
 * artifact patterns are predictable.
 */
function stripBlockNoteUiArtifacts(html: string): string {
	let clean = html;

	clean = clean.replace(/<div\s+class="bn-resize-handle"[^>]*><\/div>/gi, "");
	clean = clean.replace(
		/<div\s+style="position:\s*absolute;[^"]*"[^>]*><\/div>/gi,
		"",
	);

	clean = clean.replace(/\s+contenteditable="[^"]*"/gi, "");
	clean = clean.replace(/\s+draggable="[^"]*"/gi, "");

	clean = clean.replace(
		/<div\s+class="bn-visual-media-wrapper"\s+style="[^"]*"\s*>/gi,
		'<div class="bn-visual-media-wrapper">',
	);
	clean = clean.replace(
		/<div\s+class="bn-file-block-content-wrapper"\s+style="[^"]*"\s*>/gi,
		'<div class="bn-file-block-content-wrapper">',
	);

	clean = clean.replace(
		/<figcaption\s+class="bn-file-caption"\s*><\/figcaption>/gi,
		"",
	);

	clean = clean.replace(/<div\s+class="bn-visual-media-wrapper"\s*>/gi, "");
	clean = clean.replace(
		/<div\s+class="bn-file-block-content-wrapper"\s*>/gi,
		"",
	);

	clean = clean.replace(/\s+class="bn-[^"]*"/gi, "");
	clean = clean.replace(
		/<span\s+class="ProseMirror-trailing-break"[^>]*><\/span>/gi,
		"",
	);

	return clean;
}

const LIST_CONTENT_TYPES = [
	"bulletListItem",
	"numberedListItem",
	"checkListItem",
] as const;
const LIST_TYPE_PATTERN = LIST_CONTENT_TYPES.join("|");

interface ParsedBlock {
	fullMatch: string;
	contentType: string | null;
}

/**
 * Rewrite BlockNote list items into standard `<ul>/<ol>/<li>` so Turndown
 * produces proper markdown lists.
 *
 * BlockNote stores list items as flat sibling blocks with
 * `data-content-type="bulletListItem"|"numberedListItem"|"checkListItem"`.
 * Turndown only understands `<ul>/<ol>/<li>`, so we group consecutive
 * same-type list items and wrap them in the appropriate list element.
 */
function rewriteBlockNoteListItems(html: string): string {
	const contentTypeRegex = new RegExp(
		`data-content-type="(${LIST_TYPE_PATTERN})"`,
	);
	const blockOuterRegex =
		/<div\s+data-node-type="blockOuter"[^>]*>([\s\S]*?)<\/div>\s*(?=<div\s+data-node-type="blockOuter"|<\/div>\s*$)/gi;

	const blocks: ParsedBlock[] = [];

	let match = blockOuterRegex.exec(html);
	while (match !== null) {
		const ctMatch = match[1].match(contentTypeRegex);
		blocks.push({
			fullMatch: match[0],
			contentType: ctMatch ? ctMatch[1] : null,
		});
		match = blockOuterRegex.exec(html);
	}

	if (!blocks.some((b) => b.contentType !== null)) {
		return html;
	}

	const replacements: { original: string; replacement: string }[] = [];
	let i = 0;

	while (i < blocks.length) {
		const blockType = blocks[i].contentType;
		if (!blockType) {
			i++;
			continue;
		}

		const groupStart = i;
		let groupEnd = i;
		while (
			groupEnd + 1 < blocks.length &&
			blocks[groupEnd + 1].contentType === blockType
		) {
			groupEnd++;
		}

		const groupBlocks = blocks.slice(groupStart, groupEnd + 1);

		const listWrapper = buildListWrapper(blockType, groupBlocks);
		const originalCombined = groupBlocks.map((b) => b.fullMatch).join("");

		replacements.push({ original: originalCombined, replacement: listWrapper });
		i = groupEnd + 1;
	}

	let output = html;
	for (const rep of replacements.reverse()) {
		output = output.replace(rep.original, rep.replacement);
	}

	return output;
}

function buildListWrapper(
	blockType: string,
	groupBlocks: ParsedBlock[],
): string {
	let listTag: string;
	let listCloseTag: string;

	if (blockType === "bulletListItem" || blockType === "checkListItem") {
		listTag = "<ul>";
		listCloseTag = "</ul>";
	} else {
		const startVal = extractStartIndex(groupBlocks[0].fullMatch);
		listTag = startVal > 1 ? `<ol start="${startVal}">` : "<ol>";
		listCloseTag = "</ol>";
	}

	const liItems = groupBlocks.map((block) => {
		const text = extractParagraphText(block.fullMatch);
		if (blockType === "checkListItem") {
			const isChecked = /checked=""/.test(block.fullMatch);
			return `<li>${isChecked ? "[x]" : "[ ]"} ${text}</li>`;
		}
		return `<li>${text}</li>`;
	});

	return `${listTag}${liItems.join("")}${listCloseTag}`;
}

function extractStartIndex(blockHtml: string): number {
	const m = blockHtml.match(/data-index="(\d+)"|data-start="(\d+)"/);
	if (!m) return 1;
	return Number.parseInt(m[1] || m[2], 10);
}

function extractParagraphText(blockHtml: string): string {
	const m = blockHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
	return m ? m[1].trim() : "";
}

function convertWithTurndown(html: string): string {
	const turndown = new TurndownService({
		headingStyle: "atx",
		codeBlockStyle: "fenced",
		bulletListMarker: "-",
		emDelimiter: "*",
		strongDelimiter: "**",
		hr: "---",
	});

	turndown.use(gfm);

	turndown.addRule("figure", {
		filter: "figure",
		replacement(_content, node) {
			const el = node as HTMLElement;
			const img = el.querySelector("img");
			const caption = el.querySelector("figcaption");

			if (!img) {
				return _content;
			}

			const src = img.getAttribute("src") || "";
			const alt = img.getAttribute("alt") || "";
			let md = `![${alt}](${src})`;

			if (caption?.textContent?.trim()) {
				md += `\n\n*${caption.textContent.trim()}*`;
			}

			return `\n\n${md}\n\n`;
		},
	});

	turndown.addRule("image", {
		filter: "img",
		replacement(_content, node) {
			const el = node as HTMLElement;
			const src = el.getAttribute("src") || "";
			const alt = el.getAttribute("alt") || "";

			if (!src) {
				return alt || "";
			}

			return `![${alt}](${src})`;
		},
	});

	const strippedHtml = stripBlockNoteUiArtifacts(html);
	const listRewrittenHtml = rewriteBlockNoteListItems(strippedHtml);
	const markdown = turndown.turndown(listRewrittenHtml);

	return cleanupMarkdown(markdown);
}

function cleanupMarkdown(markdown: string): string {
	return markdown
		.replace(/\r\n?/g, "\n")
		.replace(/[ \t]+$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
