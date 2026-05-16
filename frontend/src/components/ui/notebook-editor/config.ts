// Single source of truth for all slash commands and block types.
// To add/remove/edit a command, change ONLY this file.

import { HeadingBlock } from "./blocks/heading-block";
import { BulletListBlock } from "./blocks/bullet-list-block";
import { NumberListBlock } from "./blocks/number-list-block";
import { QuoteBlock } from "./blocks/quote-block";
import { CodeBlock } from "./blocks/code-block";
import { DividerBlock } from "./blocks/divider-block";
import { ParagraphBlock } from "./blocks/paragraph-block";

export type BlockType =
	| "paragraph"
	| "h1"
	| "h2"
	| "h3"
	| "bullet"
	| "number"
	| "quote"
	| "code"
	| "divider";

export interface BlockConfigEntry {
	triggers: string[];
	label: string;
	description?: string;
	type: BlockType;
	component: React.ComponentType<BlockComponentProps>;
	markdownPrefix: string;
	icon?: string;
}

export interface EditorBlock {
	id: string;
	type: BlockType;
	content: string;
}

export interface BlockComponentProps {
	block: EditorBlock;
	onContentChange: (id: string, content: string) => void;
	onKeyDown: (e: React.KeyboardEvent, id: string) => void;
	onSlashCommand: (id: string) => void;
	isFocused: boolean;
}

export const NOTEBOOK_BLOCK_CONFIG: BlockConfigEntry[] = [
	{
		triggers: ["/h1", "/#"],
		label: "Heading 1",
		description: "Large section heading",
		type: "h1",
		component: HeadingBlock,
		markdownPrefix: "# ",
		icon: "H1",
	},
	{
		triggers: ["/h2", "/##"],
		label: "Heading 2",
		description: "Medium section heading",
		type: "h2",
		component: HeadingBlock,
		markdownPrefix: "## ",
		icon: "H2",
	},
	{
		triggers: ["/h3", "/###"],
		label: "Heading 3",
		description: "Small section heading",
		type: "h3",
		component: HeadingBlock,
		markdownPrefix: "### ",
		icon: "H3",
	},
	{
		triggers: ["/bullet", "/-"],
		label: "Bullet List",
		description: "Unordered list item",
		type: "bullet",
		component: BulletListBlock,
		markdownPrefix: "- ",
		icon: "•",
	},
	{
		triggers: ["/number", "/1."],
		label: "Numbered List",
		description: "Ordered list item",
		type: "number",
		component: NumberListBlock,
		markdownPrefix: "1. ",
		icon: "1.",
	},
	{
		triggers: ["/quote", "/>"],
		label: "Quote",
		description: "Blockquote",
		type: "quote",
		component: QuoteBlock,
		markdownPrefix: "> ",
		icon: "❝",
	},
	{
		triggers: ["/code"],
		label: "Code Block",
		description: "Code snippet",
		type: "code",
		component: CodeBlock,
		markdownPrefix: "```\n",
		icon: "</>",
	},
	{
		triggers: ["/divider", "/---"],
		label: "Divider",
		description: "Horizontal rule",
		type: "divider",
		component: DividerBlock,
		markdownPrefix: "---\n",
		icon: "—",
	},
];

/** Look up a config entry by trigger string */
export function findCommandByTrigger(input: string): BlockConfigEntry | undefined {
	return NOTEBOOK_BLOCK_CONFIG.find((entry) =>
		entry.triggers.some((t) => t.startsWith(input)),
	);
}

/** Filter config entries matching a partial trigger string */
export function filterCommandsByInput(input: string): BlockConfigEntry[] {
	if (!input) return NOTEBOOK_BLOCK_CONFIG;
	return NOTEBOOK_BLOCK_CONFIG.filter((entry) =>
		entry.triggers.some((t) => t.startsWith(input)),
	);
}

/** Get the default paragraph config (not a slash command) */
export function getParagraphConfig(): BlockConfigEntry {
	return {
		triggers: [],
		label: "Paragraph",
		type: "paragraph",
		component: ParagraphBlock,
		markdownPrefix: "",
	};
}

/** Generate a unique block ID */
export function generateBlockId(): string {
	return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
