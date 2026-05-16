import type { BlockComponentProps } from "../config";

export function ParagraphBlock({ block, onContentChange, onKeyDown, onSlashCommand }: BlockComponentProps) {
	return (
		<div
			contentEditable
			suppressContentEditableWarning
			className="outline-none min-h-[1.5em] py-0.5 text-base leading-relaxed"
			onInput={(e) => onContentChange(block.id, e.currentTarget.textContent || "")}
			onKeyDown={(e) => onKeyDown(e, block.id)}
			onKeyUp={(e) => {
				if (e.key === "/" && (e.currentTarget.textContent || "").startsWith("/")) {
					onSlashCommand(block.id);
				}
			}}
			data-block-id={block.id}
			data-block-type="paragraph"
		/>
	);
}
