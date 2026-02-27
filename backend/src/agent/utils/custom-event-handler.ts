import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { ThinkingStep } from "./thinking-steps";
import { getToolThinkingInfo, getNextThinkingStepId } from "./thinking-steps";

export class ThinkingStepCallbackHandler extends BaseCallbackHandler {
	name = "thinking_step_handler";
	private toolStepIds = new Map<string, string>();

	async handleToolStart(
		tool: { name?: string },
		input: Record<string, unknown>,
		runId: string,
		_parentRunId?: string,
		_tags?: string[],
		_metadata?: Record<string, unknown>,
		runConfig?: RunnableConfig,
	): Promise<void> {
		const toolName = tool.name || "unknown_tool";
		const stepId = getNextThinkingStepId();
		this.toolStepIds.set(runId, stepId);

		const thinkingInfo = getToolThinkingInfo(toolName, input);
		const step: ThinkingStep = {
			step_id: stepId,
			title: thinkingInfo.title,
			status: "in_progress",
			items: thinkingInfo.items,
		};

		if (runConfig) {
			await dispatchCustomEvent("custom", { type: "thinking", ...step }, runConfig);
		}
	}

	async handleToolEnd(
		output: unknown,
		runId: string,
		_parentRunId?: string,
		_tags?: string[],
		runConfig?: RunnableConfig,
	): Promise<void> {
		const stepId = this.toolStepIds.get(runId);
		if (!stepId) return;

		const step: ThinkingStep = {
			step_id: stepId,
			title: "Completed",
			status: "completed",
			items: [],
		};

		if (runConfig) {
			await dispatchCustomEvent("custom", { type: "thinking", ...step }, runConfig);
		}
		this.toolStepIds.delete(runId);
	}
}
