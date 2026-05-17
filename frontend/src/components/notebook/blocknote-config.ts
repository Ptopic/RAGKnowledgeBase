import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from "@blocknote/core";
import { createCssVariablesTheme, createHighlighter } from "shiki/bundle/full";

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

export const schema = BlockNoteSchema.create({
	blockSpecs: { ...blockSpecs, codeBlock: codeBlockSpec },
});

export { SUPPORTED_LANGUAGES };
