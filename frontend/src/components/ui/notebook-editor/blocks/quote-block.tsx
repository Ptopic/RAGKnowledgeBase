import type { BlockComponentProps } from "../config";

export function QuoteBlock({ block, onContentChange, onKeyDown, onSlashCommand }: BlockComponentProps) {
	return (
		<div className="border-l-4 border-muted-foreground/30 pl-4 py-0.5">
			<div
				contentEditable
				suppressContentEditableWarning
				className="outline-none min-h-[1.5em] text-base leading-relaxed italic text-muted-foreground"
				onInput={(e) => onContentChange(block.id, e.currentTarget.textContent || "")}
				onKeyDown={(e) => onKeyDown(e, block.id)}
				onKeyUp={(e) => {
					if (e.key === "/" && (e.currentTarget.textContent || "").startsWith("/")) {
						onSlashCommand(block.id);
					}
				}}
				data-block-id={block.id}
				data-block-type="quote"
			/>
		</div>
	);
}
