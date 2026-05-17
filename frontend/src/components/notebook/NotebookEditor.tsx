"use client";

import "@blocknote/shadcn/style.css";

import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs, filterSuggestionItems } from "@blocknote/core";
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
import { createCssVariablesTheme, createHighlighter } from "shiki/bundle/full";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

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
}

export function NotebookEditor({ initialContent, onChange }: NotebookEditorProps) {
	const initialized = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const editor = useCreateBlockNote({
		schema,
		tables: {
			headers: true,
		},
		uploadFile: async (file) => {
			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.readAsDataURL(file);
			});
		},
	});

	useEditorChange(async (editor) => {
		onChange(editor.blocksToFullHTML(editor.document));
	}, editor);

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

				const blocks = await editor.tryParseHTMLToBlocks(initialContent);
				if (blocks.length > 0) {
					editor.replaceBlocks(editor.document, blocks);
					return;
				}

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
		void isDark;
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
