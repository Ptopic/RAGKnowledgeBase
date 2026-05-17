import TurndownService from "turndown";

const turndown = new TurndownService({
	headingStyle: "atx",
	codeBlockStyle: "fenced",
	bulletListMarker: "-",
});

turndown.keep(["u"]);

turndown.addRule("linebreak", {
	filter: "br",
	replacement: () => "  \n",
});

turndown.addRule("checklist", {
	filter: (node) =>
		node.nodeName === "INPUT" && node.getAttribute("type") === "checkbox",
	replacement: (_content, node) => {
		const checked = (node as HTMLInputElement).checked;
		return `[${checked ? "x" : " "}]`;
	},
});

function stripBlockNoteHtml(html: string): string {
	if (typeof window === "undefined") return html;

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const blockElements = Array.from(doc.body.querySelectorAll(".bn-block-outer"));
	if (blockElements.length === 0) return html;

	doc.querySelectorAll(".ProseMirror-trailingBreak").forEach((el) => {
		el.remove();
	});

	const parts: string[] = [];
	for (const block of blockElements) {
		const contentDiv = block.querySelector(".bn-block-content");
		if (!contentDiv) continue;

		if (contentDiv.textContent?.trim() === "") {
			parts.push("<br>");
		} else {
			parts.push(contentDiv.innerHTML.trim());
		}
	}

	return parts.join("\n\n");
}

export function htmlToMarkdown(html: string): string {
	const cleanHtml = stripBlockNoteHtml(html);
	return turndown.turndown(cleanHtml).replace(/\n{3,}/g, "\n\n").trim();
}

// --- Legacy block JSON support (for existing notebooks) ---

type BlockNode = {
	type: string;
	props?: Record<string, unknown>;
	content?: InlineNode[];
	children?: BlockNode[];
};

type InlineNode = {
	type: string;
	text?: string;
	href?: string;
	content?: InlineNode[];
	[key: string]: unknown;
};

function inlineToMarkdown(nodes: InlineNode[] | undefined): string {
	if (!nodes) return "";
	return nodes
		.map((n) => {
			if (n.type === "link") {
				const inner = inlineToMarkdown(n.content);
				return `[${inner}](${n.href || ""})`;
			}
			if (n.type === "bold") return `**${n.text || ""}**`;
			if (n.type === "italic") return `*${n.text || ""}*`;
			if (n.type === "underline") return `<u>${n.text || ""}</u>`;
			if (n.type === "strike") return `~~${n.text || ""}~~`;
			if (n.type === "code") return `\`${n.text || ""}\``;
			if (n.type === "styled") return inlineToMarkdown(n.content as InlineNode[]);
			return n.text || "";
		})
		.join("");
}

function blockToMarkdown(block: BlockNode): string {
	const props = block.props || {};
	const text = inlineToMarkdown(block.content);
	const isEmpty = !text.trim();

	switch (block.type) {
		case "heading": {
			const level = (props.level as number) || 1;
			return `${"#".repeat(level)} ${text}`;
		}
		case "codeBlock": {
			const lang = (props.language as string) || "";
			return `\`\`\`${lang}\n${text}\n\`\`\``;
		}
		case "quote":
			return text
				.split("\n")
				.map((l) => `> ${l}`)
				.join("\n");
		case "bulletListItem":
			return `- ${text}`;
		case "numberedListItem":
			return `1. ${text}`;
		case "checkListItem":
			return `- [ ] ${text}`;
		case "divider":
			return "---";
		case "image": {
			const src = (props.url as string) || "";
			const alt = (props.caption as string) || "";
			return `![${alt}](${src})`;
		}
		default:
			if (isEmpty) return "<br>";
			return text;
	}
}

function blocksToMarkdown(blocks: BlockNode[]): string {
	return blocks
		.map((block) => {
			let md = blockToMarkdown(block);
			if (block.children?.length) {
				md = `${md}\n\n${blocksToMarkdown(block.children)}`;
			}
			return md;
		})
		.join("\n\n");
}

/**
 * Convert notebook content to markdown.
 * Handles both HTML (new format) and JSON blocks (legacy format).
 */
export function contentToMarkdown(content: string): string {
	if (!content.trim()) return "";

	try {
		const blocks = JSON.parse(content);
		if (Array.isArray(blocks)) return blocksToMarkdown(blocks);
	} catch {}

	return htmlToMarkdown(content);
}
