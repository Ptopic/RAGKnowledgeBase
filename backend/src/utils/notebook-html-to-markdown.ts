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

	// <div class="bn-resize-handle" ...></div>
	clean = clean.replace(/<div\s+class="bn-resize-handle"[^>]*><\/div>/gi, "");

	// <div style="position: absolute; height: 100%; width: 100%"></div>
	clean = clean.replace(
		/<div\s+style="position:\s*absolute;[^"]*"[^>]*><\/div>/gi,
		"",
	);

	clean = clean.replace(/\s+contenteditable="[^"]*"/gi, "");
	clean = clean.replace(/\s+draggable="[^"]*"/gi, "");

	// Strip editor-layout inline styles on BlockNote wrappers
	clean = clean.replace(
		/<div\s+class="bn-visual-media-wrapper"\s+style="[^"]*"\s*>/gi,
		'<div class="bn-visual-media-wrapper">',
	);
	clean = clean.replace(
		/<div\s+class="bn-file-block-content-wrapper"\s+style="[^"]*"\s*>/gi,
		'<div class="bn-file-block-content-wrapper">',
	);

	// <figcaption class="bn-file-caption"></figcaption>
	clean = clean.replace(
		/<figcaption\s+class="bn-file-caption"\s*><\/figcaption>/gi,
		"",
	);

	// Unwrap .bn-visual-media-wrapper divs (just contain an <img>)
	clean = clean.replace(/<div\s+class="bn-visual-media-wrapper"\s*>/gi, "");

	// Unwrap .bn-file-block-content-wrapper divs
	clean = clean.replace(
		/<div\s+class="bn-file-block-content-wrapper"\s*>/gi,
		"",
	);

	clean = clean.replace(/\s+class="bn-[^"]*"/gi, "");

	// ProseMirror trailing break: <span class="ProseMirror-trailing-break">
	clean = clean.replace(
		/<span\s+class="ProseMirror-trailing-break"[^>]*><\/span>/gi,
		"",
	);

	return clean;
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

	// <figure><img><figcaption> → ![alt](url) + *caption*
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

	// Explicit <img> rule to handle missing src gracefully
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

	const cleanHtml = stripBlockNoteUiArtifacts(html);
	const markdown = turndown.turndown(cleanHtml);

	return cleanupMarkdown(markdown);
}

function cleanupMarkdown(markdown: string): string {
	return markdown
		.replace(/\r\n?/g, "\n")
		.replace(/[ \t]+$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
