"use client";

import { useEffect, useRef, useState } from "react";
import {
	type BlockConfigEntry,
	type EditorBlock,
	NOTEBOOK_BLOCK_CONFIG,
	filterCommandsByInput,
	generateBlockId,
	getParagraphConfig,
} from "./config";

interface SlashCommandMenuProps {
	blockId: string;
	position: { top: number; left: number };
	filter: string;
	onSelect: (blockId: string, entry: BlockConfigEntry) => void;
	onClose: () => void;
}

export function SlashCommandMenu({
	blockId,
	position,
	filter,
	onSelect,
	onClose,
}: SlashCommandMenuProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const menuRef = useRef<HTMLDivElement>(null);
	const filtered = filterCommandsByInput(filter);

	useEffect(() => {
		setSelectedIndex(0);
	}, [filter]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((i) => (i + 1) % filtered.length);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
				return;
			}
			if (e.key === "Enter") {
				e.preventDefault();
				if (filtered[selectedIndex]) {
					onSelect(blockId, filtered[selectedIndex]);
				}
				return;
			}
		};

		document.addEventListener("keydown", handleKeyDown, true);
		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, [selectedIndex, filtered, blockId, onSelect, onClose]);

	if (filtered.length === 0) {
		return (
			<div
				ref={menuRef}
				className="absolute z-50 bg-popover border rounded-lg shadow-lg p-2 text-sm text-muted-foreground"
				style={{ top: position.top, left: position.left }}
			>
				No matching commands
			</div>
		);
	}

	return (
		<div
			ref={menuRef}
			className="absolute z-50 bg-popover border rounded-lg shadow-lg py-1 w-64 max-h-64 overflow-y-auto"
			style={{ top: position.top, left: position.left }}
		>
			{filtered.map((entry, i) => (
				<button
					key={entry.type}
					className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
						i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
					}`}
					onClick={() => onSelect(blockId, entry)}
					onMouseEnter={() => setSelectedIndex(i)}
				>
					<span className="w-8 h-8 flex items-center justify-center rounded-md bg-muted text-xs font-mono shrink-0">
						{entry.icon}
					</span>
					<div className="flex-1 min-w-0">
						<div className="font-medium">{entry.label}</div>
						{entry.description && (
							<div className="text-xs text-muted-foreground truncate">
								{entry.description}
							</div>
						)}
					</div>
					<span className="text-xs text-muted-foreground font-mono shrink-0">
						{entry.triggers[0]}
					</span>
				</button>
			))}
		</div>
	);
}
