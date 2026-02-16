"use client";

import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCallState } from "@/hooks/use-chat-stream";
import { ToolCallRenderer } from "./tool-call-renderer";
import { formatToolName } from "@/lib/chat/format-utils";

interface ToolCallBubbleProps {
	toolCallState: ToolCallState;
	isStreaming?: boolean;
}

export function ToolCallBubble({
	toolCallState,
	isStreaming = false,
}: ToolCallBubbleProps) {
	const { toolCall, toolMessage, errored } = toolCallState;
	const toolName = toolCall.name || "unknown";

	// Get tool message status from ToolMessage (if available)
	const toolStatus = (toolMessage as any)?.status || (errored ? "error" : "success");

	const isRunning = isStreaming && !toolMessage && !errored;
	const hasResult = !!toolMessage;

	return (
		<div className="my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
			<div className="flex items-center gap-2 mb-2">
				<div
					className={cn(
						"flex items-center justify-center rounded-lg",
						isRunning
							? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
							: hasResult
								? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
								: "bg-destructive/10 text-destructive",
					)}
				>
					{isRunning ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Sparkles className="size-4" />
					)}
				</div>
				<span className="text-sm font-medium text-muted-foreground">
					{isRunning ? "Running" : errored ? "Failed" : "Completed"}: {formatToolName(toolName)}
				</span>
			</div>

			<div className="ml-6">
				<ToolCallRenderer
					toolName={toolName}
					args={toolCall.args}
					result={toolMessage?.content}
					errored={errored}
					isRunning={isRunning}
					status={toolStatus}
				/>
			</div>
		</div>
	);
}
