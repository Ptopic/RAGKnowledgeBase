import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { LLMResult } from "@langchain/core/outputs";
import { Logger } from "@nestjs/common";

/**
 * LangChain callback that aggregates token usage across one streaming run.
 *
 * Why a custom handler:
 *  - The agent controller streams a LangGraph graph to the HTTP response.
 *  - It needs to know the *actual* tokens consumed after the stream ends
 *    so it can deduct the right number of credits asynchronously.
 *  - OpenAI returns `usage_metadata` on the final LLMResult. We sum those
 *    across every LLM call in the run (reformulation, tool calls, answer…).
 *
 * Usage:
 *   const tracker = new CreditTrackingHandler();
 *   await streamDeepAgent({ ..., creditHandler: tracker });
 *   // after stream ends:
 *   const { tokensIn, tokensOut, modelName } = tracker.totals();
 */
export class CreditTrackingHandler extends BaseCallbackHandler {
	name = "credit_tracking_handler";

	private static readonly logger = new Logger(CreditTrackingHandler.name);

	private inputTokens = 0;
	private outputTokens = 0;
	private lastModelName: string | null = null;
	private callCount = 0;
	private zeroUsageCallCount = 0;
	private missingModelNameCount = 0;

	override async handleLLMEnd(
		output: LLMResult,
		_runId?: string,
	): Promise<void> {
		this.callCount += 1;

		const generations = output.generations ?? [];
		for (const batch of generations) {
			for (const gen of batch) {
				const { inTokens, outTokens } = extractTokenUsage(gen, output);
				if (inTokens > 0 || outTokens > 0) {
					this.inputTokens += inTokens;
					this.outputTokens += outTokens;
				} else {
					this.zeroUsageCallCount += 1;
				}

				const modelFromGen = extractModelName(gen, output);
				if (modelFromGen) this.lastModelName = modelFromGen;
				else this.missingModelNameCount += 1;
			}
		}
	}

	override async handleLLMStart(): Promise<void> {
		// No-op; we read everything in handleLLMEnd where the model name
		// and usage are guaranteed to be present.
	}

	override async handleLLMError(): Promise<void> {
		// Errors still get logged; the post-deduct in the controller will
		// run with whatever partial usage we accumulated.
	}

	reportCaptureOutcome(operationType: string): void {
		const total = this.inputTokens + this.outputTokens;
		if (total > 0 && this.lastModelName) return;

		CreditTrackingHandler.logger.warn(
			`[credits] ${operationType}: usage capture incomplete — ` +
				`calls=${this.callCount} tokensIn=${this.inputTokens} ` +
				`tokensOut=${this.outputTokens} modelName=${this.lastModelName ?? "null"} ` +
				`zeroUsageCalls=${this.zeroUsageCallCount} ` +
				`missingModelNameCount=${this.missingModelNameCount}`,
		);
	}

	totals(): {
		tokensIn: number;
		tokensOut: number;
		modelName: string | null;
		callCount: number;
	} {
		return {
			tokensIn: this.inputTokens,
			tokensOut: this.outputTokens,
			modelName: this.lastModelName,
			callCount: this.callCount,
		};
	}
}

/**
 * Try every known shape where LangChain / OpenAI reports token usage,
 * in order of reliability. Returns 0 for each side if nothing is found.
 */
function extractTokenUsage(
	gen: unknown,
	output: LLMResult,
): { inTokens: number; outTokens: number } {
	let inTokens = 0;
	let outTokens = 0;

	const message = (gen as { message?: unknown } | undefined)?.message as
		| {
				usage_metadata?: {
					input_tokens?: number;
					output_tokens?: number;
				};
				response_metadata?: {
					tokenUsage?: { promptTokens?: number; completionTokens?: number };
					usage?: { prompt_tokens?: number; completion_tokens?: number };
				};
				additional_kwargs?: {
					usage?: { prompt_tokens?: number; completion_tokens?: number };
				};
				usage_metadata_v2?: unknown;
		  }
		| undefined;

	if (message) {
		// Modern LangChain AIMessage.usage_metadata
		const m1 = message.usage_metadata;
		if (m1) {
			inTokens += m1.input_tokens ?? 0;
			outTokens += m1.output_tokens ?? 0;
		}

		// Some LangChain versions: response_metadata.tokenUsage
		const m2 = message.response_metadata?.tokenUsage;
		if (m2) {
			inTokens += m2.promptTokens ?? 0;
			outTokens += m2.completionTokens ?? 0;
		}

		// Older LangChain: response_metadata.usage
		const m3 = message.response_metadata?.usage;
		if (m3) {
			inTokens += m3.prompt_tokens ?? 0;
			outTokens += m3.completion_tokens ?? 0;
		}

		// Legacy: additional_kwargs.usage
		const m4 = message.additional_kwargs?.usage;
		if (m4) {
			inTokens += m4.prompt_tokens ?? 0;
			outTokens += m4.completion_tokens ?? 0;
		}
	}

	// Raw OpenAI path: output.llmOutput.usage
	const llmUsage = (
		output.llmOutput as
			| { usage?: { prompt_tokens?: number; completion_tokens?: number } }
			| undefined
	)?.usage;
	if (llmUsage) {
		inTokens += llmUsage.prompt_tokens ?? 0;
		outTokens += llmUsage.completion_tokens ?? 0;
	}

	// Some adapters: output.llmOutput.tokenUsage
	const llmTokenUsage = (
		output.llmOutput as
			| { tokenUsage?: { promptTokens?: number; completionTokens?: number } }
			| undefined
	)?.tokenUsage;
	if (llmTokenUsage) {
		inTokens += llmTokenUsage.promptTokens ?? 0;
		outTokens += llmTokenUsage.completionTokens ?? 0;
	}

	return { inTokens, outTokens };
}

/**
 * Try every known shape where LangChain / OpenAI reports the model
 * name. Returns the first non-empty match.
 */
function extractModelName(gen: unknown, output: LLMResult): string | null {
	const candidates: Array<unknown> = [
		(output.llmOutput as { model_name?: unknown } | undefined)?.model_name,
		(output.llmOutput as { model?: unknown } | undefined)?.model,
		(output.llmOutput as { modelName?: unknown } | undefined)?.modelName,
	];

	const message = (gen as { message?: unknown } | undefined)?.message as
		| {
				response_metadata?: {
					model_name?: unknown;
					modelName?: unknown;
					model?: unknown;
				};
		  }
		| undefined;
	if (message?.response_metadata) {
		candidates.push(message.response_metadata.model_name);
		candidates.push(message.response_metadata.modelName);
		candidates.push(message.response_metadata.model);
	}

	const generationInfo = (gen as { generationInfo?: { model?: unknown } })
		?.generationInfo;
	if (generationInfo) {
		candidates.push(generationInfo.model);
	}

	for (const candidate of candidates) {
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return candidate;
		}
	}
	return null;
}
