import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	CreateSearchSpaceRequest,
	CreateSearchSpaceResponse,
	SearchSpace,
} from "./types";

export const getSearchSpaces =
	(request: ICallableRequestBuilder<SearchSpace[]>) =>
	async (): Promise<SearchSpace[]> =>
		request.call(`${config.apiUrl}/searchspaces`, (init) => ({
			...init,
			method: "GET",
		}));

export const getSearchSpace =
	(request: ICallableRequestBuilder<SearchSpace>) =>
	async (id: number): Promise<SearchSpace> =>
		request.call(`${config.apiUrl}/searchspaces/${id}`, (init) => ({
			...init,
			method: "GET",
		}));

export const createSearchSpace =
	(request: ICallableRequestBuilder<CreateSearchSpaceResponse>) =>
	async (data: CreateSearchSpaceRequest) =>
		request.call(`${config.apiUrl}/searchspaces`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteSearchSpace =
	(request: ICallableRequestBuilder<void>) => async (id: number) =>
		request.call(`${config.apiUrl}/searchspaces/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));
