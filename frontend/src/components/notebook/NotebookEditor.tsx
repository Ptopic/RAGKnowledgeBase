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
	const { resolvedTheme } = useTheme();

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

	return (
		<div className="min-h-[300px] rounded-md border bg-background text-foreground">
			<BlockNoteView
				editor={editor}
				theme={resolvedTheme === "dark" ? "dark" : "light"}
			/>
		</div>
	);
}
