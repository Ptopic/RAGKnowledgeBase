import type { ICallableRequestBuilder } from "@requestBuilder/types";
import config from "@shared/config";
import type {
	CreateLogRequest,
	GetLogsParams,
	GetLogsSummaryParams,
	Log,
	LogSummary,
	UpdateLogRequest,
} from "./types";

export const getLogs =
	(request: ICallableRequestBuilder<Log[]>) =>
	async (params: GetLogsParams): Promise<Log[]> => {
		const url = new URL(`${config.apiUrl}/logs`);

		if (params.search_space_id !== undefined) {
			url.searchParams.append(
				"search_space_id",
				params.search_space_id.toString(),
			);
		}
		if (params.level) {
			url.searchParams.append("level", params.level);
		}
		if (params.status) {
			url.searchParams.append("status", params.status);
		}
		if (params.source) {
			url.searchParams.append("source", params.source);
		}
		if (params.start_date) {
			url.searchParams.append("start_date", params.start_date);
		}
		if (params.end_date) {
			url.searchParams.append("end_date", params.end_date);
		}
		if (params.skip !== undefined) {
			url.searchParams.append("skip", params.skip.toString());
		}
		if (params.limit !== undefined) {
			url.searchParams.append("limit", params.limit.toString());
		}

		return request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
	};

export const getLog =
	(request: ICallableRequestBuilder<Log>) => async (id: number) =>
		request.call(`${config.apiUrl}/logs/${id}`, (init) => ({
			...init,
			method: "GET",
		}));

export const createLog =
	(request: ICallableRequestBuilder<Log>) =>
	async (data: CreateLogRequest) =>
		request.call(`${config.apiUrl}/logs`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const updateLog =
	(request: ICallableRequestBuilder<Log>) =>
	async (id: number, data: UpdateLogRequest) =>
		request.call(`${config.apiUrl}/logs/${id}`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteLog =
	(request: ICallableRequestBuilder<void>) => async (id: number) =>
		request.call(`${config.apiUrl}/logs/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getLogsSummary =
	(request: ICallableRequestBuilder<LogSummary>) =>
	async (params: GetLogsSummaryParams): Promise<LogSummary> => {
		const hours = params.hours ?? 24;
		const url = `${config.apiUrl}/logs/search-space/${params.search_space_id}/summary?hours=${hours}`;

		return request.call(url, (init) => ({
			...init,
			method: "GET",
		}));
	};
