import { ChevronRightIcon } from "lucide-react";
import { type FC, createContext, useCallback, useEffect, useState } from "react";
import {
	ChainOfThoughtItem,
} from "@/components/prompt-kit/chain-of-thought";
import { TextShimmerLoader } from "@/components/prompt-kit/loader";
import { cn } from "@/lib/utils";
import type { ThinkingStep } from "@/lib/chat/message-adapter";

export const ThinkingStepsContext = createContext<Map<string, ThinkingStep[]>>(new Map());

export const ThinkingStepsDisplay: FC<{ steps: ThinkingStep[]; isThreadRunning?: boolean }> = ({
	steps,
	isThreadRunning = true,
}) => {
	const [isOpen, setIsOpen] = useState(true);

	const getEffectiveStatus = useCallback(
		(step: ThinkingStep): "pending" | "in_progress" | "completed" => {
			if (step.status === "in_progress" && !isThreadRunning) {
				return "completed";
			}
			return step.status;
		},
		[isThreadRunning],
	);

	const completedSteps = steps.filter((s) => getEffectiveStatus(s) === "completed").length;
	const inProgressStep = steps.find((s) => getEffectiveStatus(s) === "in_progress");
	const allCompleted = completedSteps === steps.length && steps.length > 0 && !isThreadRunning;
	const isProcessing = isThreadRunning && !allCompleted;

	useEffect(() => {
		if (allCompleted) {
			setIsOpen(false);
		}
	}, [allCompleted]);

	if (steps.length === 0) return null;

	const getHeaderText = () => {
		if (allCompleted) {
			return `Reviewed ${completedSteps} ${completedSteps === 1 ? "step" : "steps"}`;
		}
		if (inProgressStep) {
			return inProgressStep.title;
		}
		if (isProcessing) {
			return `Processing ${completedSteps}/${steps.length} steps`;
		}
		return `Reviewed ${completedSteps} ${completedSteps === 1 ? "step" : "steps"}`;
	};

	return (
		<div className="mx-auto w-full max-w-(--thread-max-width) px-2 py-2">
			<div className="rounded-lg">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className={cn(
						"flex w-full items-center gap-1.5 text-left text-sm transition-colors",
						"text-muted-foreground hover:text-foreground",
					)}
				>
					{isProcessing ? (
						<TextShimmerLoader text={getHeaderText()} size="sm" />
					) : (
						<span>{getHeaderText()}</span>
					)}

					<ChevronRightIcon
						className={cn("size-4 transition-transform duration-200", isOpen && "rotate-90")}
					/>
				</button>

				<div
					className={cn(
						"grid transition-[grid-template-rows] duration-300 ease-out",
						isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
					)}
				>
					<div className="overflow-hidden">
						<div className="mt-3 pl-1">
							{steps.map((step, index) => {
								const effectiveStatus = getEffectiveStatus(step);
								const isLast = index === steps.length - 1;

								return (
									<div key={step.id} className="relative flex gap-3">
										<div className="relative flex flex-col items-center w-2">
											{!isLast && (
												<div className="absolute left-1/2 top-[15px] -bottom-[7px] w-px -translate-x-1/2 bg-muted-foreground/30" />
											)}
											<div className="relative z-10 mt-[7px] flex shrink-0 items-center justify-center">
												{effectiveStatus === "in_progress" ? (
													<span className="relative flex size-2">
														<span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
														<span className="relative inline-flex size-2 rounded-full bg-primary" />
													</span>
												) : (
													<span className="size-2 rounded-full bg-muted-foreground/30" />
												)}
											</div>
										</div>

										<div className="flex-1 min-w-0 pb-4">
											<div
												className={cn(
													"text-sm leading-5",
													effectiveStatus === "in_progress" && "text-foreground font-medium",
													effectiveStatus === "completed" && "text-muted-foreground",
													effectiveStatus === "pending" && "text-muted-foreground/60",
												)}
											>
												{effectiveStatus === "in_progress" ? (
													<TextShimmerLoader text={step.title} size="sm" />
												) : (
													step.title
												)}
											</div>

											{step.items && step.items.length > 0 && (
												<div className="mt-1 space-y-0.5">
													{step.items.map((item, idx) => (
														<ChainOfThoughtItem key={`${step.id}-item-${idx}`} className="text-xs">
															{item}
														</ChainOfThoughtItem>
													))}
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
