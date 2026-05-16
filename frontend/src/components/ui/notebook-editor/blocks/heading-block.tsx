import type { BlockComponentProps } from "../config";

export function HeadingBlock({ block, onContentChange, onKeyDown, onSlashCommand }: BlockComponentProps) {
	const sizeClass =
		block.type === "h1"
			? "text-3xl font-bold"
			: block.type === "h2"
				? "text-2xl font-semibold"
				: "text-xl font-semibold";

	return (
		<h1
			contentEditable
			suppressContentEditableWarning
			className={`outline-none min-h-[1.5em] py-0.5 leading-tight ${sizeClass}`}
			onInput={(e) => onContentChange(block.id, e.currentTarget.textContent || "")}
			onKeyDown={(e) => onKeyDown(e, block.id)}
			onKeyUp={(e) => {
				if (e.key === "/" && (e.currentTarget.textContent || "").startsWith("/")) {
					onSlashCommand(block.id);
				}
			}}
			data-block-id={block.id}
			data-block-type={block.type}
		/>
	);
}
