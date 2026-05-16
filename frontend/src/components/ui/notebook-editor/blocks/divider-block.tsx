import type { BlockComponentProps } from "../config";

export function DividerBlock({ block, onKeyDown }: BlockComponentProps) {
	return (
		<hr
			className="my-2 border-border"
			onKeyDown={(e) => onKeyDown(e, block.id)}
			data-block-id={block.id}
			data-block-type="divider"
		/>
	);
}
