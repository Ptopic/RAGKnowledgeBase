export interface LLMConfig {
	id: number;
	name: string;
	provider: string;
	custom_provider?: string;
	model_name: string;
	api_key: string;
	api_base?: string;
	language?: string;
	litellm_params?: Record<string, any>;
	created_at: string;
	search_space_id: number;
}

export interface LLMPreferences {
	long_context_llm_id?: number;
	fast_llm_id?: number;
	strategic_llm_id?: number;
	long_context_llm?: LLMConfig;
	fast_llm?: LLMConfig;
	strategic_llm?: LLMConfig;
}

export interface CreateLLMConfig {
	name: string;
	provider: string;
	custom_provider?: string;
	model_name: string;
	api_key: string;
	api_base?: string;
	language?: string;
	litellm_params?: Record<string, any>;
	search_space_id: number;
}

export interface UpdateLLMConfig {
	name?: string;
	provider?: string;
	custom_provider?: string;
	model_name?: string;
	api_key?: string;
	api_base?: string;
	litellm_params?: Record<string, any>;
}

export interface GetLLMConfigsParams {
	search_space_id: number;
}

export interface GetLLMPreferencesParams {
	search_space_id: number;
}

export interface UpdateLLMPreferencesParams {
	search_space_id: number;
	preferences: Partial<LLMPreferences>;
}
