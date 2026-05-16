import type { ICallableRequestBuilder } from "@requestBuilder/types";
import config from "@shared/config";
import type {
	CreateApiKey,
	UpdateApiKey,
	UserProviderApiKey,
} from "./types";

export const getApiKeys =
	(request: ICallableRequestBuilder<UserProviderApiKey[]>) =>
	async (): Promise<UserProviderApiKey[]> =>
		request.call(`${config.apiUrl}/settings/api-keys`, (init) => ({
			...init,
			method: "GET",
		}));

export const createApiKey =
	(request: ICallableRequestBuilder<UserProviderApiKey>) =>
	async (data: CreateApiKey): Promise<UserProviderApiKey> =>
		request.call(`${config.apiUrl}/settings/api-keys`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const updateApiKey =
	(request: ICallableRequestBuilder<UserProviderApiKey>) =>
	async (id: string, data: UpdateApiKey): Promise<UserProviderApiKey> =>
		request.call(`${config.apiUrl}/settings/api-keys/${id}`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteApiKey =
	(request: ICallableRequestBuilder<void>) =>
	async (id: string): Promise<void> =>
		request.call(`${config.apiUrl}/settings/api-keys/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));
