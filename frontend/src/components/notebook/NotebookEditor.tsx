"use client";

import "@blocknote/shadcn/style.css";

import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

interface NotebookEditorProps {
	initialContent?: string;
	onChange: (markdown: string) => void;
}

export function NotebookEditor({ initialContent, onChange }: NotebookEditorProps) {
	const initialized = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const editor = useCreateBlockNote({});

	useEditorChange(async (editor) => {
		const markdown = editor.blocksToMarkdownLossy(editor.document);
		onChange(markdown);
	}, editor);

	useEffect(() => {
		if (initialContent && editor && !initialized.current) {
			initialized.current = true;
			const content = initialContent;
			const loadMarkdown = async () => {
				const blocks = await editor.tryParseMarkdownToBlocks(content);
				editor.replaceBlocks(editor.document, blocks);
			};
			loadMarkdown();
		}
	}, [initialContent, editor]);

	useEffect(() => {
		const root = containerRef.current?.querySelector(".bn-root");
		if (root instanceof HTMLElement) {
			root.style.setProperty("--bn-colors-editor-background", "var(--background)", "important");
			root.style.setProperty("--bn-colors-editor-text", "var(--foreground)", "important");
		}
		void isDark;
	}, [isDark]);

	return (
		<div ref={containerRef} className="flex-1 min-h-0 bg-background text-foreground">
			<BlockNoteView
				editor={editor}
				theme={isDark ? "dark" : "light"}
			/>
		</div>
	);
}
