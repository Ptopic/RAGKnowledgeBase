"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ToolCallRenderer } from "@/components/assistant-ui/tool-call-renderer";
import { useAuiState } from "@assistant-ui/store";

export const ToolPartAdapter: ToolCallMessagePartComponent = ({
	toolName,
	argsText,
	result,
	status,
}) => {
	let args: unknown;
	if (argsText) {
		try {
			args = JSON.parse(argsText);
		} catch {
			args = argsText;
		}
	}

	const isRunning = status?.type === "running";
	const isError = status?.type === "incomplete";

	const isLastToolCall = useAuiState((s) => {
		const parts = s.message.parts;
		const currentId = s.part.toolCallId;
		const toolCallIds = parts
			.filter((p: any) => p.type === "tool-call")
			.map((p: any) => p.toolCallId);
		const lastToolCallId = toolCallIds[toolCallIds.length - 1];
		return currentId === lastToolCallId;
	});

	const showBottomMargin = toolName === "search_knowledge_base" && !isLastToolCall;

	return (
		<div className={showBottomMargin ? "mb-2" : ""}>
			<ToolCallRenderer
				toolName={toolName}
				args={args}
				result={result}
				isRunning={isRunning}
				errored={isError}
				status={isError ? "error" : "success"}
			/>
		</div>
	);
};
