export interface LLMConfig {
	id: number;
	name: string;
	provider: string;
	custom_provider?: string;
	model_name: string;
	api_key_preview: string;
	api_base?: string;
	is_platform_key?: boolean;
	litellm_params?: Record<string, unknown>;
	created_at: string;
	search_space_id: number;
	user_provider_key_id?: string;
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
	api_key?: string;
	api_base?: string;
	is_platform_key?: boolean;
	litellm_params?: Record<string, unknown>;
	search_space_id: number;
	user_provider_key_id?: string;
}

export interface UpdateLLMConfig {
	name?: string;
	provider?: string;
	custom_provider?: string;
	model_name?: string;
	api_key?: string;
	api_base?: string;
	is_platform_key?: boolean;
	litellm_params?: Record<string, unknown>;
	user_provider_key_id?: string;
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
