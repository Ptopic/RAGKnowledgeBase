"use client";

import "@blocknote/shadcn/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { schema } from "./blocknote-config";

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

				try {
					const blocks = await editor.tryParseHTMLToBlocks(content);
					if (blocks.length > 0) {
						editor.replaceBlocks(editor.document, blocks);
						return;
					}
				} catch {}

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
