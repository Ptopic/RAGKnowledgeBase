"use client";

import "@blocknote/shadcn/style.css";

import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { createCssVariablesTheme, createHighlighter } from "shiki/bundle/full";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

const {
	audio: _audio,
	video: _video,
	file: _file,
	toggleListItem: _toggleListItem,
	codeBlock: _codeBlock,
	...blockSpecs
} = defaultBlockSpecs;

const SUPPORTED_LANGUAGES: Record<string, { name: string; aliases?: string[] }> = {
	javascript: { name: "JavaScript", aliases: ["js"] },
	typescript: { name: "TypeScript", aliases: ["ts"] },
	python: { name: "Python" },
	java: { name: "Java" },
	csharp: { name: "C#", aliases: ["cs"] },
	cpp: { name: "C++", aliases: ["c++"] },
	c: { name: "C" },
	go: { name: "Go" },
	rust: { name: "Rust" },
	ruby: { name: "Ruby" },
	php: { name: "PHP" },
	swift: { name: "Swift" },
	kotlin: { name: "Kotlin" },
	sql: { name: "SQL" },
	json: { name: "JSON" },
	yaml: { name: "YAML" },
	xml: { name: "XML" },
	html: { name: "HTML" },
	css: { name: "CSS" },
	scss: { name: "SCSS" },
	bash: { name: "Bash", aliases: ["sh", "shell"] },
	powershell: { name: "PowerShell" },
	markdown: { name: "Markdown", aliases: ["md"] },
	text: { name: "Plain Text" },
};

const shikiCssTheme = createCssVariablesTheme({ name: "css-variables" });
const SHIKI_LANGS = Object.keys(SUPPORTED_LANGUAGES).filter((l) => l !== "text");

const codeBlockSpec = createCodeBlockSpec({
	defaultLanguage: "text",
	supportedLanguages: SUPPORTED_LANGUAGES,
	createHighlighter: async () =>
		createHighlighter({
			themes: [shikiCssTheme],
			langs: SHIKI_LANGS,
		}) as Promise<any>,
});

const schema = BlockNoteSchema.create({
	blockSpecs: { ...blockSpecs, codeBlock: codeBlockSpec },
});

interface NotebookViewerProps {
	content: string;
}

export function NotebookViewer({ content }: NotebookViewerProps) {
	const initialized = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const editor = useCreateBlockNote({ schema, tables: { headers: true } });

	useEffect(() => {
		if (content && editor && !initialized.current) {
			initialized.current = true;
			const loadContent = async () => {
				try {
					const blocks = JSON.parse(content);
					if (Array.isArray(blocks)) {
						editor.replaceBlocks(editor.document, blocks);
						return;
					}
				} catch {}

				const blocks = await editor.tryParseHTMLToBlocks(content);
				if (blocks.length > 0) {
					editor.replaceBlocks(editor.document, blocks);
					return;
				}

				const mdBlocks = await editor.tryParseMarkdownToBlocks(content);
				editor.replaceBlocks(editor.document, mdBlocks);
			};
			loadContent();
		}
	}, [content, editor]);

	useEffect(() => {
		const root = containerRef.current?.querySelector(".bn-root");
		if (root instanceof HTMLElement) {
			root.style.setProperty("--bn-colors-editor-background", "var(--background)", "important");
			root.style.setProperty("--bn-colors-editor-text", "var(--foreground)", "important");
		}
		void isDark;
	}, [isDark]);

	return (
		<div ref={containerRef} className="-ml-[54px] bg-background text-foreground">
			<BlockNoteView
				editor={editor}
				theme={isDark ? "dark" : "light"}
				editable={false}
			/>
		</div>
	);
}
