"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import {
	Bold,
	Italic,
	Underline as UnderlineIcon,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Quote,
	Code,
	Link as LinkIcon,
	ImagePlus,
} from "lucide-react";
import { useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
	content: string;
	onChange: (html: string) => void;
	placeholder?: string;
	editable?: boolean;
}

const toolbarButtonClass = "h-8 w-8";

export function RichTextEditor({
	content,
	onChange,
	placeholder = "Start writing...",
	editable = true,
}: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: false,
			}),
			Placeholder.configure({
				placeholder,
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-primary underline cursor-pointer",
				},
			}),
			Image.configure({
				HTMLAttributes: {
					class: "max-w-full h-auto rounded-md",
				},
			}),
			Underline,
		],
		content,
		editable,
		editorProps: {
			attributes: {
				class:
					"prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
			},
		},
		onUpdate: ({ editor: editorInstance }) => {
			onChange(editorInstance.getHTML());
		},
	});

	useEffect(() => {
		if (editor && !editor.isDestroyed) {
			const currentHTML = editor.getHTML();
			if (currentHTML !== content) {
				editor.commands.setContent(content, false);
			}
		}
	}, [content, editor]);

	const addImage = useCallback(() => {
		if (!editor) return;
		const url = window.prompt("Enter image URL:");
		if (url) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	}, [editor]);

	const addLink = useCallback(() => {
		if (!editor) return;
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("Enter link URL:", previousUrl);
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	}, [editor]);

	if (!editor) return null;

	return (
		<div className="rounded-md border bg-transparent shadow-xs overflow-hidden">
			{editable && (
				<div className="flex flex-wrap items-center gap-0.5 border-b p-1 bg-muted/30">
					<TooltipProvider delayDuration={300}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() => editor.chain().focus().toggleBold().run()}
									data-active={editor.isActive("bold")}
								>
									<Bold className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Bold</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() => editor.chain().focus().toggleItalic().run()}
									data-active={editor.isActive("italic")}
								>
									<Italic className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Italic</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() => editor.chain().focus().toggleUnderline().run()}
									data-active={editor.isActive("underline")}
								>
									<UnderlineIcon className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Underline</TooltipContent>
						</Tooltip>

						<div className="mx-1 h-6 w-px bg-border" />

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() =>
										editor.chain().focus().toggleHeading({ level: 1 }).run()
									}
									data-active={editor.isActive("heading", { level: 1 })}
								>
									<Heading1 className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Heading 1</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() =>
										editor.chain().focus().toggleHeading({ level: 2 }).run()
									}
									data-active={editor.isActive("heading", { level: 2 })}
								>
									<Heading2 className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Heading 2</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() =>
										editor.chain().focus().toggleHeading({ level: 3 }).run()
									}
									data-active={editor.isActive("heading", { level: 3 })}
								>
									<Heading3 className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Heading 3</TooltipContent>
						</Tooltip>

						<div className="mx-1 h-6 w-px bg-border" />

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() => editor.chain().focus().toggleBulletList().run()}
									data-active={editor.isActive("bulletList")}
								>
									<List className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Bullet List</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() => editor.chain().focus().toggleOrderedList().run()}
									data-active={editor.isActive("orderedList")}
								>
									<ListOrdered className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Ordered List</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() => editor.chain().focus().toggleBlockquote().run()}
									data-active={editor.isActive("blockquote")}
								>
									<Quote className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Blockquote</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={() => editor.chain().focus().toggleCodeBlock().run()}
									data-active={editor.isActive("codeBlock")}
								>
									<Code className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Code Block</TooltipContent>
						</Tooltip>

						<div className="mx-1 h-6 w-px bg-border" />

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={addLink}
									data-active={editor.isActive("link")}
								>
									<LinkIcon className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Link</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={toolbarButtonClass}
									onClick={addImage}
								>
									<ImagePlus className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Image</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			)}

			<EditorContent editor={editor} />

			<style>{`
				.tiptap {
					outline: none;
				}
				.tiptap p.is-editor-empty:first-child::before {
					color: var(--muted-foreground);
					content: attr(data-placeholder);
					float: left;
					height: 0;
					pointer-events: none;
				}
				.tiptap h1 {
					font-size: 1.75rem;
					font-weight: 700;
					line-height: 1.2;
					margin-top: 1.5rem;
					margin-bottom: 0.5rem;
				}
				.tiptap h2 {
					font-size: 1.375rem;
					font-weight: 600;
					line-height: 1.3;
					margin-top: 1.25rem;
					margin-bottom: 0.5rem;
				}
				.tiptap h3 {
					font-size: 1.125rem;
					font-weight: 600;
					line-height: 1.4;
					margin-top: 1rem;
					margin-bottom: 0.5rem;
				}
				.tiptap ul {
					list-style-type: disc;
					padding-left: 1.5rem;
					margin: 0.5rem 0;
				}
				.tiptap ol {
					list-style-type: decimal;
					padding-left: 1.5rem;
					margin: 0.5rem 0;
				}
				.tiptap li {
					margin: 0.25rem 0;
				}
				.tiptap blockquote {
					border-left: 3px solid var(--border);
					padding-left: 1rem;
					margin: 0.75rem 0;
					color: var(--muted-foreground);
					font-style: italic;
				}
				.tiptap pre {
					background: var(--muted);
					border-radius: 0.375rem;
					padding: 0.75rem 1rem;
					margin: 0.75rem 0;
					overflow-x: auto;
				}
				.tiptap code {
					font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
					font-size: 0.875em;
				}
				.tiptap pre code {
					background: transparent;
					padding: 0;
				}
				.tiptap p code {
					background: var(--muted);
					border-radius: 0.25rem;
					padding: 0.125rem 0.25rem;
				}
				.tiptap a {
					color: var(--primary);
					text-decoration: underline;
					cursor: pointer;
				}
				.tiptap img {
					max-width: 100%;
					height: auto;
					border-radius: 0.375rem;
					margin: 0.75rem 0;
				}
				.tiptap p {
					margin: 0.5rem 0;
				}
				.tiptap [data-active="true"] {
					background: var(--accent);
					color: var(--accent-foreground);
				}
			`}</style>
		</div>
	);
}
