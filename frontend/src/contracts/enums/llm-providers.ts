export interface LLMProvider {
	value: string;
	label: string;
}

export const LLM_PROVIDERS: LLMProvider[] = [
	{
		value: "OPENAI",
		label: "OpenAI",
	},
];

/**
 * OpenAI model registry — the single source of truth for model list,
 * per-1K-token pricing, and advertised context window / max output.
 *
 * Prices must mirror backend/src/subscription/credit-cost.ts because
 * the backend uses the same numbers to convert raw token usage into
 * credits at request time. The pre-formatted `costEstimate`,
 * `creditEstimate`, and `tokenEstimate` strings are derived from the
 * numeric fields so the two registries cannot drift out of sync.
 *
 * Credit math: 1 credit = $0.001 USD (1000 credits = $1). Per-1K-token
 * credits are therefore `usdPerK * 1000`; see `fmtCredits` for the
 * floating-point-safe rounding.
 */
export interface OpenAIModelOption {
	value: string;
	label: string;
	/** USD per 1K input tokens (non-cached) */
	inputPer1K: number;
	/** USD per 1K output tokens */
	outputPer1K: number;
	/** Max input tokens the model accepts (context window) */
	contextWindow: number;
	/** Max output tokens per response */
	maxOutput: number;
	costEstimate: string;
	creditEstimate: string;
	tokenEstimate: string;
}

const RAW_OPENAI_MODELS: ReadonlyArray<
	Omit<OpenAIModelOption, "costEstimate" | "creditEstimate" | "tokenEstimate">
> = [
	{
		value: "gpt-4.1",
		label: "GPT-4.1",
		inputPer1K: 0.002,
		outputPer1K: 0.008,
		contextWindow: 1_047_576,
		maxOutput: 32_768,
	},
	{
		value: "gpt-4.1-mini",
		label: "GPT-4.1 Mini",
		inputPer1K: 0.0004,
		outputPer1K: 0.0016,
		contextWindow: 1_047_576,
		maxOutput: 32_768,
	},
	{
		value: "gpt-5.2",
		label: "GPT-5.2",
		inputPer1K: 0.00175,
		outputPer1K: 0.014,
		contextWindow: 400_000,
		maxOutput: 32_768,
	},
	{
		value: "gpt-5.4",
		label: "GPT-5.4",
		inputPer1K: 0.0025,
		outputPer1K: 0.015,
		contextWindow: 400_000,
		maxOutput: 32_768,
	},
	{
		value: "gpt-5.4-mini",
		label: "GPT-5.4 Mini",
		inputPer1K: 0.00075,
		outputPer1K: 0.0045,
		contextWindow: 200_000,
		maxOutput: 16_384,
	},
	{
		value: "gpt-5.5",
		label: "GPT-5.5",
		inputPer1K: 0.005,
		outputPer1K: 0.03,
		contextWindow: 400_000,
		maxOutput: 65_536,
	},
] as const;

const fmtUsd = (n: number): string => {
	return `$${n.toString().replace(/0+$/, "").replace(/\.$/, "")}`;
};

const fmtTokens = (n: number): string => {
	if (n >= 1_000_000) return `${n / 1_000_000}M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
	return String(n);
};

const fmtCredits = (usdPerK: number): string => {
	const credits = usdPerK * 1000;
	return Number(credits.toFixed(4)).toString();
};

export const OPENAI_MODELS: ReadonlyArray<OpenAIModelOption> =
	RAW_OPENAI_MODELS.map((m) => ({
		...m,
		costEstimate: `${fmtUsd(m.inputPer1K)} input / ${fmtUsd(m.outputPer1K)} output per 1K tokens`,
		creditEstimate: `${fmtCredits(m.inputPer1K)} / ${fmtCredits(m.outputPer1K)} credits per 1K tokens`,
		tokenEstimate: `Context ${fmtTokens(m.contextWindow)} · Max output ${fmtTokens(m.maxOutput)}`,
	}));

/** Look up a model by its `value` (e.g. "gpt-5.2"). Returns undefined if unknown. */
export function getOpenAIModel(
	value: string | null | undefined,
): OpenAIModelOption | undefined {
	if (!value) return undefined;
	return OPENAI_MODELS.find((m) => m.value === value);
}
