"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type BlockConfigEntry,
	type BlockComponentProps,
	type EditorBlock,
	type BlockType,
	NOTEBOOK_BLOCK_CONFIG,
	generateBlockId,
	getParagraphConfig,
} from "./config";
import { SlashCommandMenu } from "./slash-command-menu";
import { blocksToMarkdown, markdownToBlocks } from "./markdown-utils";

interface NotebookBlockEditorProps {
	value: string;
	onChange: (markdown: string) => void;
	placeholder?: string;
}

export function NotebookBlockEditor({
	value,
	onChange,
	placeholder,
}: NotebookBlockEditorProps) {
	const [blocks, setBlocks] = useState<EditorBlock[]>(() => markdownToBlocks(value));
	const [slashMenu, setSlashMenu] = useState<{
		blockId: string;
		position: { top: number; left: number };
		filter: string;
	} | null>(null);
	const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const incoming = markdownToBlocks(value);
		if (blocksToMarkdown(blocks) !== value) {
			setBlocks(incoming);
		}
	}, [value]);

	const syncToParent = useCallback(
		(updatedBlocks: EditorBlock[]) => {
			onChange(blocksToMarkdown(updatedBlocks));
		},
		[onChange],
	);

	const handleContentChange = useCallback(
		(blockId: string, content: string) => {
			setBlocks((prev) => {
				const updated = prev.map((b) =>
					b.id === blockId ? { ...b, content } : b,
				);
				syncToParent(updated);
				return updated;
			});
		},
		[syncToParent],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent, blockId: string) => {
			if (slashMenu) return;

			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				setBlocks((prev) => {
					const idx = prev.findIndex((b) => b.id === blockId);
					if (idx === -1) return prev;
					const newBlock: EditorBlock = {
						id: generateBlockId(),
						type: "paragraph",
						content: "",
					};
					const updated = [...prev];
					updated.splice(idx + 1, 0, newBlock);
					syncToParent(updated);
					setTimeout(() => {
						const el = containerRef.current?.querySelector(
							`[data-block-id="${newBlock.id}"]`,
						) as HTMLElement;
						el?.focus();
					}, 0);
					return updated;
				});
				return;
			}

			if (e.key === "Backspace") {
				const block = blocks.find((b) => b.id === blockId);
				if (block && !block.content && block.type !== "paragraph") {
					e.preventDefault();
					setBlocks((prev) => {
						const updated = prev.map((b) =>
							b.id === blockId ? { ...b, type: "paragraph" as BlockType, content: "" } : b,
						);
						syncToParent(updated);
						return updated;
					});
					return;
				}

				if (block && !block.content && blocks.length > 1) {
					e.preventDefault();
					setBlocks((prev) => {
						const idx = prev.findIndex((b) => b.id === blockId);
						if (idx === -1 || prev.length <= 1) return prev;
						const focusIdx = idx > 0 ? idx - 1 : 0;
						const updated = prev.filter((b) => b.id !== blockId);
						syncToParent(updated);
						setTimeout(() => {
							const focusBlock = updated[focusIdx];
							const el = containerRef.current?.querySelector(
								`[data-block-id="${focusBlock?.id}"]`,
							) as HTMLElement;
							el?.focus();
						}, 0);
						return updated;
					});
				}
			}
		},
		[blocks, slashMenu, syncToParent],
	);

	const handleSlashCommand = useCallback(
		(blockId: string) => {
			const el = containerRef.current?.querySelector(
				`[data-block-id="${blockId}"]`,
			) as HTMLElement;
			if (!el) return;

			const rect = el.getBoundingClientRect();
			const containerRect = containerRef.current!.getBoundingClientRect();

			const block = blocks.find((b) => b.id === blockId);
			const content = block?.content || "";

			setSlashMenu({
				blockId,
				position: {
					top: rect.bottom - containerRect.top + 4,
					left: rect.left - containerRect.left,
				},
				filter: content,
			});
		},
		[blocks],
	);

	const handleSlashSelect = useCallback(
		(blockId: string, entry: BlockConfigEntry) => {
			setSlashMenu(null);
			setBlocks((prev) => {
				const updated = prev.map((b) =>
					b.id === blockId ? { ...b, type: entry.type, content: "" } : b,
				);
				syncToParent(updated);
				setTimeout(() => {
					const el = containerRef.current?.querySelector(
						`[data-block-id="${blockId}"]`,
					) as HTMLElement;
					el?.focus();
				}, 0);
				return updated;
			});
		},
		[syncToParent],
	);

	const handleSlashClose = useCallback(() => {
		setSlashMenu(null);
		const blockId = slashMenu?.blockId;
		if (blockId) {
			setBlocks((prev) => {
				const updated = prev.map((b) =>
					b.id === blockId ? { ...b, type: "paragraph" as BlockType, content: "" } : b,
				);
				syncToParent(updated);
				return updated;
			});
		}
	}, [slashMenu, syncToParent]);

	useEffect(() => {
		if (!slashMenu) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as Node) &&
				!containerRef.current?.contains(e.target as Node)
			) {
				handleSlashClose();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [slashMenu, handleSlashClose]);

	const menuRef = useRef<HTMLDivElement>(null);

	return (
		<div ref={containerRef} className="relative">
			{blocks.length === 0 && placeholder && (
				<div className="text-muted-foreground py-2">{placeholder}</div>
			)}
			{blocks.map((block) => {
				const config =
					NOTEBOOK_BLOCK_CONFIG.find((c) => c.type === block.type) ||
					getParagraphConfig();
				const Component = config.component;

				return (
					<div
						key={block.id}
						className="group relative"
						onFocus={() => setFocusedBlockId(block.id)}
						onBlur={() => setFocusedBlockId(null)}
					>
						{!block.content && block.type === "paragraph" && !focusedBlockId && (
								<div className="absolute top-0.5 left-0 text-muted-foreground pointer-events-none select-none py-0.5">
									{placeholder || 'Type "/" for commands...'}
								</div>
							)}
						<Component
							block={block}
							onContentChange={handleContentChange}
							onKeyDown={handleKeyDown}
							onSlashCommand={handleSlashCommand}
							isFocused={focusedBlockId === block.id}
						/>
					</div>
				);
			})}

			{slashMenu && (
				<div ref={menuRef}>
					<SlashCommandMenu
						blockId={slashMenu.blockId}
						position={slashMenu.position}
						filter={slashMenu.filter}
						onSelect={handleSlashSelect}
						onClose={handleSlashClose}
					/>
				</div>
			)}
		</div>
	);
}
