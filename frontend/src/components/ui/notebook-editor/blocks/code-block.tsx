import type { BlockComponentProps } from "../config";

export function CodeBlock({ block, onContentChange, onKeyDown, onSlashCommand }: BlockComponentProps) {
	return (
		<pre className="bg-muted rounded-md p-4 overflow-x-auto">
			<code
				contentEditable
				suppressContentEditableWarning
				className="outline-none text-sm font-mono whitespace-pre-wrap min-h-[1.5em] block"
				onInput={(e) => onContentChange(block.id, e.currentTarget.textContent || "")}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						onContentChange(block.id, (block.content || "") + "\n");
						const el = e.currentTarget;
						requestAnimationFrame(() => {
							el.textContent = (block.content || "") + "\n";
							const range = document.createRange();
							const sel = window.getSelection();
							range.selectNodeContents(el);
							range.collapse(false);
							sel?.removeAllRanges();
							sel?.addRange(range);
						});
						return;
					}
					onKeyDown(e, block.id);
				}}
				onKeyUp={(e) => {
					if (e.key === "/" && (e.currentTarget.textContent || "").startsWith("/")) {
						onSlashCommand(block.id);
					}
				}}
				data-block-id={block.id}
				data-block-type="code"
			/>
		</pre>
	);
}
