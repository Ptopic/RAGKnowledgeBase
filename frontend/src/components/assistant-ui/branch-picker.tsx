import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { FC } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

interface BranchPickerProps {
	className?: string;
	current?: number;
	total?: number;
	onPrevious?: () => void;
	onNext?: () => void;
	hideWhenSingleBranch?: boolean;
}

export const BranchPicker: FC<BranchPickerProps> = ({
	className,
	current = 1,
	total = 1,
	onPrevious,
	onNext,
	hideWhenSingleBranch = true,
}) => {
	if (hideWhenSingleBranch && total <= 1) return null;

	return (
		<div
			className={cn(
				"aui-branch-picker-root -ml-2 mr-2 inline-flex items-center text-muted-foreground text-xs",
				className,
			)}
		>
			<TooltipIconButton tooltip="Previous" onClick={onPrevious} disabled={current <= 1}>
				<ChevronLeftIcon />
			</TooltipIconButton>
			<span className="aui-branch-picker-state font-medium">
				{current} / {total}
			</span>
			<TooltipIconButton tooltip="Next" onClick={onNext} disabled={current >= total}>
				<ChevronRightIcon />
			</TooltipIconButton>
		</div>
	);
};
