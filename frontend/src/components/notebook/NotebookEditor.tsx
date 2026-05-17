"use client";

import "@blocknote/shadcn/style.css";

import { filterSuggestionItems } from "@blocknote/core";
import {
	BasicTextStyleButton,
	BlockTypeSelect,
	blockTypeSelectItems,
	ColorStyleButton,
	CreateLinkButton,
	FileCaptionButton,
	FilePanelController,
	FormattingToolbar,
	FormattingToolbarController,
	getDefaultReactSlashMenuItems,
	NestBlockButton,
	SuggestionMenuController,
	TextAlignButton,
	UnnestBlockButton,
	UploadTab,
	useBlockNoteEditor,
	useComponentsContext,
	useCreateBlockNote,
	useDictionary,
	useEditorChange,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

import { config } from "@/shared/config";
import { schema } from "./blocknote-config";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function CustomFormattingToolbar() {
	const dict = useDictionary();
	const items = blockTypeSelectItems(dict).filter(
		(item) => item.type !== "toggleListItem" && !(item.props as Record<string, unknown>)?.isToggleable,
	);

	return (
		<FormattingToolbar>
			<BlockTypeSelect items={items} />
			<BasicTextStyleButton basicTextStyle="bold" />
			<BasicTextStyleButton basicTextStyle="italic" />
			<BasicTextStyleButton basicTextStyle="underline" />
			<BasicTextStyleButton basicTextStyle="strike" />
			<BasicTextStyleButton basicTextStyle="code" />
			<TextAlignButton textAlignment="left" />
			<TextAlignButton textAlignment="center" />
			<TextAlignButton textAlignment="right" />
			<ColorStyleButton />
			<FileCaptionButton />
			<NestBlockButton />
			<UnnestBlockButton />
			<CreateLinkButton />
		</FormattingToolbar>
	);
}

function SlashMenu() {
	const editor = useBlockNoteEditor();

	return (
		<SuggestionMenuController
			triggerCharacter="/"
			getItems={async (query) => {
				const items = getDefaultReactSlashMenuItems(editor)
					.filter((item) => !item.title.toLowerCase().includes("toggle"));
				return filterSuggestionItems(items, query);
			}}
		/>
	);
}

function UploadOnlyFilePanel({ blockId }: { blockId: string }) {
	const components = useComponentsContext()!;
	const [loading, setLoading] = useState(false);
	const [openTab, setOpenTab] = useState("Upload");

	return (
		<components.FilePanel.Root
			className="bn-panel"
			tabs={[
				{
					name: "Upload",
					tabPanel: <UploadTab blockId={blockId} setLoading={setLoading} />,
				},
			]}
			openTab={openTab}
			setOpenTab={setOpenTab}
			defaultOpenTab="Upload"
			loading={loading}
		/>
	);
}

interface NotebookEditorProps {
	initialContent?: string;
	onChange: (content: string) => void;
	searchSpaceId: number;
}

export function NotebookEditor({ initialContent, onChange, searchSpaceId }: NotebookEditorProps) {
	const initialized = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const uploadFile = useCallback(async (file: File): Promise<string> => {
		if (file.size > MAX_IMAGE_SIZE) {
			console.warn("File exceeds 5 MB limit and was not uploaded.");
			return "";
		}

		const formData = new FormData();
		formData.append("file", file);

		try {
			const res = await fetch(
				`${config.apiUrl}/searchspaces/${searchSpaceId}/notebooks/upload-image`,
				{
					method: "POST",
					body: formData,
					credentials: "include",
				},
			);
			if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
			const { url } = await res.json();
			return url;
		} catch (err) {
			console.warn("Image upload failed:", err);
			const reader = new FileReader();
			return new Promise((resolve) => {
				reader.onload = () => resolve(reader.result as string);
				reader.readAsDataURL(file);
			});
		}
	}, [searchSpaceId]);

	const editor = useCreateBlockNote({
		schema,
		tables: {
			headers: true,
		},
		uploadFile,
	});

	const debouncedOnChange = useCallback((html: string) => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		debounceTimerRef.current = setTimeout(() => {
			onChange(html);
		}, 300);
	}, [onChange]);

	useEditorChange((editor) => {
		debouncedOnChange(editor.blocksToFullHTML(editor.document));
	}, editor);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (initialContent && editor && !initialized.current) {
			initialized.current = true;
			const loadContent = async () => {
				try {
					const blocks = JSON.parse(initialContent);
					if (Array.isArray(blocks)) {
						editor.replaceBlocks(editor.document, blocks);
						return;
					}
				} catch {}

				try {
					const blocks = await editor.tryParseHTMLToBlocks(initialContent);
					if (blocks.length > 0) {
						editor.replaceBlocks(editor.document, blocks);
						return;
					}
				} catch {}

				const mdBlocks = await editor.tryParseMarkdownToBlocks(initialContent);
				editor.replaceBlocks(editor.document, mdBlocks);
			};
			loadContent();
		}
	}, [initialContent, editor]);

	useEffect(() => {
		const root = containerRef.current?.querySelector(".bn-root");
		if (root instanceof HTMLElement) {
			root.style.setProperty("--bn-colors-editor-background", "var(--background)", "important");
			root.style.setProperty("--bn-colors-editor-text", "var(--foreground)", "important");
		}
	}, [isDark]);

	return (
		<div ref={containerRef} className="flex-1 min-h-0 bg-background text-foreground">
			<BlockNoteView
				editor={editor}
				theme={isDark ? "dark" : "light"}
				formattingToolbar={false}
				slashMenu={false}
				filePanel={false}
			>
				<FormattingToolbarController formattingToolbar={CustomFormattingToolbar} />
				<SlashMenu />
				<FilePanelController filePanel={UploadOnlyFilePanel} />
			</BlockNoteView>
		</div>
	);
}
