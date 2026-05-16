import type { BlockComponentProps } from "../config";

export function BulletListBlock({ block, onContentChange, onKeyDown, onSlashCommand }: BlockComponentProps) {
	return (
		<div className="flex items-start gap-2">
			<span className="mt-0.5 text-lg leading-relaxed select-none">•</span>
			<div
				contentEditable
				suppressContentEditableWarning
				className="outline-none min-h-[1.5em] py-0.5 text-base leading-relaxed flex-1"
				onInput={(e) => onContentChange(block.id, e.currentTarget.textContent || "")}
				onKeyDown={(e) => onKeyDown(e, block.id)}
				onKeyUp={(e) => {
					if (e.key === "/" && (e.currentTarget.textContent || "").startsWith("/")) {
						onSlashCommand(block.id);
					}
				}}
				data-block-id={block.id}
				data-block-type="bullet"
			/>
		</div>
	);
}
