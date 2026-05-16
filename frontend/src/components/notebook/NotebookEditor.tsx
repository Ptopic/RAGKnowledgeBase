"use client";

import { useEffect, useRef } from "react";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import "@blocknote/core/fonts/inter.css";

interface NotebookEditorProps {
	initialContent?: string;
	onChange: (markdown: string) => void;
}

export function NotebookEditor({ initialContent, onChange }: NotebookEditorProps) {
	const initialized = useRef(false);

	const editor = useCreateBlockNote({});

	useEditorChange(async (editor) => {
		const markdown = editor.blocksToMarkdownLossy(editor.document);
		onChange(markdown);
	}, editor);

	useEffect(() => {
		if (initialContent && editor && !initialized.current) {
			initialized.current = true;
			async function loadMarkdown() {
				const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
				editor.replaceBlocks(editor.document, blocks);
			}
			loadMarkdown();
		}
	}, [initialContent, editor]);

	return (
		<div className="min-h-[300px] rounded-md border bg-background">
			<BlockNoteView editor={editor} />
		</div>
	);
}
