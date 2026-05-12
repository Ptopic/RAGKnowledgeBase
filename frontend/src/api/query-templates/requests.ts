import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	CreateQueryTemplateRequest,
	CreateQueryTemplateResponse,
	GetQueryTemplatesParams,
	QueryTemplate,
	UpdateQueryTemplateRequest,
} from "./types";

export const getGlobalQueryTemplates =
	(request: ICallableRequestBuilder<QueryTemplate[]>) =>
	async (): Promise<QueryTemplate[]> =>
		request.call(`${config.apiUrl}/admin/query-templates`, (init) => ({
			...init,
			method: "GET",
		}));

export const createGlobalQueryTemplate =
	(request: ICallableRequestBuilder<CreateQueryTemplateResponse>) =>
	async (data: CreateQueryTemplateRequest): Promise<CreateQueryTemplateResponse> =>
		request.call(`${config.apiUrl}/admin/query-templates`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const updateGlobalQueryTemplate =
	(request: ICallableRequestBuilder<QueryTemplate>) =>
	async (id: number, data: UpdateQueryTemplateRequest): Promise<QueryTemplate> =>
		request.call(`${config.apiUrl}/admin/query-templates/${id}`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteGlobalQueryTemplate =
	(request: ICallableRequestBuilder<void>) =>
	async (id: number): Promise<void> =>
		request.call(`${config.apiUrl}/admin/query-templates/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getSearchSpaceQueryTemplates =
	(request: ICallableRequestBuilder<QueryTemplate[]>) =>
	async (params: GetQueryTemplatesParams): Promise<QueryTemplate[]> => {
		const url = new URL(
			`${config.apiUrl}/searchspaces/${params.search_space_id}/query-templates`,
		);
		return request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
	};

export const createSearchSpaceQueryTemplate =
	(request: ICallableRequestBuilder<CreateQueryTemplateResponse>) =>
	async (
		searchSpaceId: number,
		data: CreateQueryTemplateRequest,
	): Promise<CreateQueryTemplateResponse> =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/query-templates`,
			(init) => ({
				...init,
				method: "POST",
				headers: {
					...init.headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			}),
		);

export const deleteSearchSpaceQueryTemplate =
	(request: ICallableRequestBuilder<void>) =>
	async (searchSpaceId: number, id: number): Promise<void> =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/query-templates/${id}`,
			(init) => ({
				...init,
				method: "DELETE",
			}),
		);
