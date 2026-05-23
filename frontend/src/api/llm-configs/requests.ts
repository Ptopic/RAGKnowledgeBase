import type { ICallableRequestBuilder } from "@requestBuilder/types";
import config from "@shared/config";
import type {
	CreateLLMConfig,
	GetLLMConfigsParams,
	GetLLMPreferencesParams,
	LLMConfig,
	LLMPreferences,
	UpdateLLMConfig,
	UpdateLLMPreferencesParams,
} from "./types";

export const getLLMConfigs =
	(request: ICallableRequestBuilder<LLMConfig[]>) =>
	async (params: GetLLMConfigsParams): Promise<LLMConfig[]> => {
		const url = new URL(`${config.apiUrl}/llm-configs`);
		url.searchParams.append(
			"search_space_id",
			params.search_space_id.toString(),
		);

		return request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
	};

export const createLLMConfig =
	(request: ICallableRequestBuilder<LLMConfig>) =>
	async (data: CreateLLMConfig): Promise<LLMConfig> =>
		request.call(`${config.apiUrl}/llm-configs`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const updateLLMConfig =
	(request: ICallableRequestBuilder<LLMConfig>) =>
	async (id: number, searchSpaceId: number, data: UpdateLLMConfig): Promise<LLMConfig> =>
		request.call(`${config.apiUrl}/llm-configs/${id}?search_space_id=${searchSpaceId}`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteLLMConfig =
	(request: ICallableRequestBuilder<void>) =>
	async (id: number, searchSpaceId: number): Promise<void> =>
		request.call(`${config.apiUrl}/llm-configs/${id}?search_space_id=${searchSpaceId}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getLLMPreferences =
	(request: ICallableRequestBuilder<LLMPreferences>) =>
	async (params: GetLLMPreferencesParams): Promise<LLMPreferences> =>
		request.call(
			`${config.apiUrl}/search-spaces/${params.search_space_id}/llm-preferences`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const updateLLMPreferences =
	(request: ICallableRequestBuilder<LLMPreferences>) =>
	async (params: UpdateLLMPreferencesParams): Promise<LLMPreferences> =>
		request.call(
			`${config.apiUrl}/search-spaces/${params.search_space_id}/llm-preferences`,
			(init) => ({
				...init,
				method: "PUT",
				headers: {
					...init.headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(params.preferences),
			}),
		);
