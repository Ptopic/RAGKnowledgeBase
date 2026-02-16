import type { Message } from "@langchain/core/messages";
import { CheckIcon, CopyIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import type { ToolCallState } from "@/hooks/use-chat-stream";
import {
	extractThinkingStepsFromMessage,
	messageContentToText,
	type ThinkingStep,
} from "@/lib/chat/message-adapter";
import { BranchPicker } from "./branch-picker";
import { MarkdownText } from "./markdown-text";
import { ThinkingStepsDisplay } from "./thinking-steps";
import { ToolCallBubble } from "./tool-call-bubble";
import { TooltipIconButton } from "./tooltip-icon-button";

interface AssistantMessageProps {
	message: Message;
	isLast?: boolean;
	isStreaming?: boolean;
	onReload?: (message: Message) => void;
	toolCalls?: ToolCallState[];
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
	message,
	isLast = false,
	isStreaming = false,
	onReload,
	toolCalls = [],
}) => {
	const [copied, setCopied] = useState(false);

	const content = useMemo(
		() => messageContentToText(message.content),
		[message.content],
	);
	const thinkingSteps = useMemo<ThinkingStep[]>(
		() => extractThinkingStepsFromMessage(message),
		[message],
	);

	const handleCopy = async () => {
		if (!content) return;
		await navigator.clipboard.writeText(content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleExportMarkdown = () => {
		const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `assistant-message-${message.id || Date.now()}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div
			className="aui-assistant-message-root group fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-3 duration-150"
			data-role="assistant"
		>
			{thinkingSteps.length > 0 && (
				<div className="mb-3">
					<ThinkingStepsDisplay
						steps={thinkingSteps}
						isThreadRunning={isStreaming && isLast}
					/>
				</div>
			)}

			{toolCalls.length > 0 && (
				<div className="space-y-2">
					{toolCalls.map((toolCallState) => (
						<ToolCallBubble
							key={toolCallState.toolCall.id}
							toolCallState={toolCallState}
							isStreaming={isStreaming && !toolCallState.toolMessage}
						/>
					))}
				</div>
			)}

			<div className="aui-assistant-message-content wrap-break-word px-2 text-foreground leading-relaxed">
				<MarkdownText text={content} />
				{isLast && isStreaming && (
					<span className="ml-1 inline-block h-3 w-3 animate-pulse rounded-full bg-primary" />
				)}
			</div>

			{message.type === "ai" && content && content.trim() !== "" && (
				<div className="aui-assistant-message-footer mt-1 mb-5 ml-2 flex items-center gap-2">
					<BranchPicker />
					<div className="aui-assistant-action-bar-root -ml-1 col-start-3 row-start-2 flex gap-1 text-muted-foreground md:data-floating:absolute md:data-floating:rounded-md md:data-floating:border md:data-floating:bg-background md:data-floating:p-1 md:data-floating:shadow-sm [&>button]:opacity-100 md:[&>button]:opacity-[var(--aui-button-opacity,1)]">
						<TooltipIconButton tooltip="Copy" onClick={handleCopy}>
							{copied ? <CheckIcon /> : <CopyIcon />}
						</TooltipIconButton>
						<TooltipIconButton
							tooltip="Export as Markdown"
							onClick={handleExportMarkdown}
						>
							<DownloadIcon />
						</TooltipIconButton>
						<TooltipIconButton
							tooltip="Refresh"
							onClick={() => onReload?.(message)}
						>
							<RefreshCwIcon />
						</TooltipIconButton>
					</div>
				</div>
			)}
		</div>
	);
};
