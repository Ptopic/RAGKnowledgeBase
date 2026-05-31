export interface LLMProvider {
	value: string;
	label: string;
	example: string;
	description: string;
	apiBase?: string;
}

export const LLM_PROVIDERS: LLMProvider[] = [
	{
		value: "OPENAI",
		label: "OpenAI",
		example: "gpt-4.1, gpt-4.1-mini, gpt-5.2",
		description: "Industry-leading GPT models with broad capabilities",
	},
	{
		value: "ANTHROPIC",
		label: "Anthropic",
		example: "claude-3-5-sonnet, claude-3-haiku",
		description: "Claude models for reasoning and long-form tasks",
	},
	{
		value: "GROQ",
		label: "Groq",
		example: "llama-3.1-70b-versatile",
		description: "Fast inference for supported open-weight models",
	},
	{
		value: "CUSTOM",
		label: "Custom / OpenAI Compatible",
		example: "custom-model",
		description: "Custom OpenAI-compatible provider using your own API base URL",
	},
];

export const OPENAI_MODELS = [
	{ value: "gpt-4.1", label: "GPT-4.1", costEstimate: "~$0.01-0.05 per request" },
	{ value: "gpt-4.1-mini", label: "GPT-4.1 Mini", costEstimate: "~$0.002-0.01 per request" },
	{ value: "gpt-5.2", label: "GPT-5.2", costEstimate: "~$0.05-0.20 per request" },
] as const;
