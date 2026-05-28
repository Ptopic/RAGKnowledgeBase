"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ToolCallRenderer } from "@/components/assistant-ui/tool-call-renderer";

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

	return (
		<ToolCallRenderer
			toolName={toolName}
			args={args}
			result={result}
			isRunning={isRunning}
			errored={isError}
			status={isError ? "error" : "success"}
		/>
	);
};
