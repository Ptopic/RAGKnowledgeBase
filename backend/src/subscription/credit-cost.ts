/**
 * Per-model OpenAI pricing (USD per 1M tokens) and advertised token
 * capacity. Source: official OpenAI pricing pages, last updated
 * 2026-06. Update this map whenever OpenAI changes their rates;
 * downstream credit calculations and frontend cost hints both read
 * from here.
 *
 * Pricing convention: 1 credit = $0.001 USD of model usage.
 *  - 1,000 credits = $1 of model compute
 *  - FREE plan: 1,000 credits / month ≈ $1 / month
 *
 * The per-1K prices shown in the model selector are derived from
 * inputPer1M / outputPer1M, so the two unit systems cannot drift
 * out of sync.
 */
export interface ModelPricing {
	/** USD per 1M input tokens (non-cached) */
	inputPer1M: number;
	/** USD per 1M output tokens */
	outputPer1M: number;
	/** Optional: USD per 1M cached input tokens (OpenAI prompt-cache discount) */
	cachedInputPer1M?: number;
	/** Human-readable label for logs / UI */
	displayName: string;
	/** Max input tokens the model accepts (context window) */
	contextWindow: number;
	/** Max output tokens per response */
	maxOutput: number;
}

export const OPENAI_MODEL_PRICING: Record<string, ModelPricing> = {
	"gpt-4.1": {
		inputPer1M: 2.0,
		outputPer1M: 8.0,
		displayName: "GPT-4.1",
		contextWindow: 1_047_576,
		maxOutput: 32_768,
	},
	"gpt-4.1-mini": {
		inputPer1M: 0.4,
		outputPer1M: 1.6,
		displayName: "GPT-4.1 Mini",
		contextWindow: 1_047_576,
		maxOutput: 32_768,
	},
	"gpt-5.2": {
		// Cached-input rate is $0.175/M per the spec; we currently use the
		// standard input rate for simplicity. If/when we want to credit
		// users for cached prompts, switch to:
		//   input - cachedTokens * 0.175 + (input - cachedTokens) * 1.75
		inputPer1M: 1.75,
		outputPer1M: 14.0,
		displayName: "GPT-5.2",
		contextWindow: 400_000,
		maxOutput: 32_768,
	},
	"gpt-5.4": {
		inputPer1M: 2.5,
		outputPer1M: 15.0,
		displayName: "GPT-5.4",
		contextWindow: 400_000,
		maxOutput: 32_768,
	},
	"gpt-5.4-mini": {
		inputPer1M: 0.75,
		outputPer1M: 4.5,
		displayName: "GPT-5.4 Mini",
		contextWindow: 200_000,
		maxOutput: 16_384,
	},
	"gpt-5.5": {
		inputPer1M: 5.0,
		outputPer1M: 30.0,
		displayName: "GPT-5.5",
		contextWindow: 400_000,
		maxOutput: 65_536,
	},
};

/** 1 credit = $0.001 USD */
export const CREDITS_PER_USD = 1000;

/** Every billed operation must consume at least this many credits. */
export const MIN_OPERATION_CREDITS = 1;

/** Operation type taxonomy for UsageRecord.operationType. */
export const UsageOperation = {
	INDEX_PAGE: "INDEX_PAGE",
	RESEARCHER_MSG: "RESEARCHER_MSG",
	QNA_MSG: "QNA_MSG",
	SEO_GEN: "SEO_GEN",
	DEEP_AGENT_MSG: "DEEP_AGENT_MSG",
} as const;

export type UsageOperationType =
	(typeof UsageOperation)[keyof typeof UsageOperation];

const FALLBACK_PRICING: ModelPricing = OPENAI_MODEL_PRICING["gpt-4.1-mini"];
const warnedUnknownModels = new Set<string>();

/**
 * Resolve pricing for a model name, falling back to gpt-4.1-mini if
 * unknown. Unknown models are logged once per process so the platform
 * can be alerted and the pricing table updated; an unmapped premium
 * model is silently under-collected otherwise.
 */
export function getModelPricing(
	modelName: string | null | undefined,
): ModelPricing {
	if (!modelName) return FALLBACK_PRICING;
	const pricing = OPENAI_MODEL_PRICING[modelName];
	if (pricing) return pricing;

	if (!warnedUnknownModels.has(modelName)) {
		warnedUnknownModels.add(modelName);
		// eslint-disable-next-line no-console
		console.warn(
			`[credit-cost] Unknown model "${modelName}" — billing at gpt-4.1-mini rate. ` +
				`Add it to OPENAI_MODEL_PRICING in subscription/credit-cost.ts.`,
		);
	}
	return FALLBACK_PRICING;
}

/**
 * Calculate the credit cost of an AI operation.
 *
 * - If `tokensIn` and `tokensOut` are both 0/undefined, returns 0.
 * - Otherwise returns at least MIN_OPERATION_CREDITS so a tiny probe is
 *   still billable.
 * - Returns an integer; rounds up.
 */
export function calculateCreditCost(
	modelName: string | null | undefined,
	tokensIn: number,
	tokensOut: number,
): number {
	const inT = Math.max(0, Math.floor(tokensIn || 0));
	const outT = Math.max(0, Math.floor(tokensOut || 0));

	if (inT === 0 && outT === 0) return 0;

	const pricing = getModelPricing(modelName);
	const inputCost = (inT / 1_000_000) * pricing.inputPer1M;
	const outputCost = (outT / 1_000_000) * pricing.outputPer1M;
	const totalUsd = inputCost + outputCost;

	const credits = Math.ceil(totalUsd * CREDITS_PER_USD);
	return Math.max(credits, MIN_OPERATION_CREDITS);
}
