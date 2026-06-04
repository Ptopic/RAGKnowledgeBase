import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import { normalizeListResponse } from "@/lib/pagination";
import type {
	CreateQueryTemplateRequest,
	CreateQueryTemplateResponse,
	GetGlobalQueryTemplatesParams,
	GetQueryTemplatesParams,
	ListResponse,
	QueryTemplate,
	UpdateQueryTemplateRequest,
} from "./types";

export const getGlobalQueryTemplates =
	(request: ICallableRequestBuilder<unknown>) =>
	async (params?: GetGlobalQueryTemplatesParams): Promise<ListResponse<QueryTemplate>> => {
		const url = new URL(`${config.apiUrl}/user/query-templates`);
		if (params?.search) {
			url.searchParams.append("search", params.search);
		}
		if (params?.skip !== undefined) {
			url.searchParams.append("skip", params.skip.toString());
		}
		if (params?.limit !== undefined) {
			url.searchParams.append("limit", params.limit.toString());
		}
		const data = await request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
		return normalizeListResponse<QueryTemplate>(data);
	};

export const createGlobalQueryTemplate =
	(request: ICallableRequestBuilder<CreateQueryTemplateResponse>) =>
	async (data: CreateQueryTemplateRequest): Promise<CreateQueryTemplateResponse> =>
		request.call(`${config.apiUrl}/user/query-templates`, (init) => ({
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
		request.call(`${config.apiUrl}/user/query-templates/${id}`, (init) => ({
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
		request.call(`${config.apiUrl}/user/query-templates/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getSearchSpaceQueryTemplates =
	(request: ICallableRequestBuilder<unknown>) =>
	async (params: GetQueryTemplatesParams): Promise<ListResponse<QueryTemplate>> => {
		const url = new URL(
			`${config.apiUrl}/searchspaces/${params.search_space_id}/query-templates`,
		);
		if (params.search) {
			url.searchParams.append("search", params.search);
		}
		if (params.skip !== undefined) {
			url.searchParams.append("skip", params.skip.toString());
		}
		if (params.limit !== undefined) {
			url.searchParams.append("limit", params.limit.toString());
		}
		const data = await request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
		return normalizeListResponse<QueryTemplate>(data);
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

export const updateSearchSpaceQueryTemplate =
	(request: ICallableRequestBuilder<QueryTemplate>) =>
	async (
		searchSpaceId: number,
		id: number,
		data: UpdateQueryTemplateRequest,
	): Promise<QueryTemplate> =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/query-templates/${id}`,
			(init) => ({
				...init,
				method: "PUT",
				headers: {
					...init.headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			}),
		);

export const pinQueryTemplate =
	(request: ICallableRequestBuilder<{ pinned_query_template_ids: number[] }>) =>
	async (
		searchSpaceId: number,
		templateId: number,
	): Promise<{ pinned_query_template_ids: number[] }> =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/query-templates/${templateId}/pin`,
			(init) => ({
				...init,
				method: "POST",
			}),
		);

export const unpinQueryTemplate =
	(request: ICallableRequestBuilder<{ pinned_query_template_ids: number[] }>) =>
	async (
		searchSpaceId: number,
		templateId: number,
	): Promise<{ pinned_query_template_ids: number[] }> =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/query-templates/${templateId}/unpin`,
			(init) => ({
				...init,
				method: "POST",
			}),
		);
