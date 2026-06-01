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

export const OPENAI_MODELS = [
	{ value: "gpt-4.1", label: "GPT-4.1", costEstimate: "~$0.01-0.05 per request" },
	{ value: "gpt-4.1-mini", label: "GPT-4.1 Mini", costEstimate: "~$0.002-0.01 per request" },
	{ value: "gpt-5.2", label: "GPT-5.2", costEstimate: "~$0.05-0.20 per request" },
] as const;
