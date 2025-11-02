import type { ICallableRequestBuilder } from "@api/requestBuilder/types";
import config from "@shared/config";
import type {
	CreateSearchSourceConnectorRequest,
	GetSearchSourceConnectorsParams,
	IndexConnectorRequest,
	IndexConnectorResponse,
	SearchSourceConnector,
	UpdateSearchSourceConnectorRequest,
} from "./types";

export const getSearchSourceConnectors =
	(request: ICallableRequestBuilder<SearchSourceConnector[]>) =>
	async (params?: GetSearchSourceConnectorsParams): Promise<SearchSourceConnector[]> => {
		const url = new URL(`${config.apiUrl}/api/v1/search-source-connectors`);

		if (params?.search_space_id !== undefined) {
			url.searchParams.append("search_space_id", params.search_space_id.toString());
		}

		return request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
	};

export const createSearchSourceConnector =
	(request: ICallableRequestBuilder<SearchSourceConnector>) =>
	async (data: CreateSearchSourceConnectorRequest, searchSpaceId: number) => {
		const url = new URL(`${config.apiUrl}/api/v1/search-source-connectors`);
		url.searchParams.append("search_space_id", searchSpaceId.toString());

		return request.call(url.toString(), (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));
	};

export const updateSearchSourceConnector =
	(request: ICallableRequestBuilder<SearchSourceConnector>) =>
	async (id: number, data: UpdateSearchSourceConnectorRequest) =>
		request.call(
			`${config.apiUrl}/api/v1/search-source-connectors/${id}`,
			(init) => ({
				...init,
				method: "PUT",
				headers: {
					...init.headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			})
		);

export const deleteSearchSourceConnector =
	(request: ICallableRequestBuilder<void>) => async (id: number) =>
		request.call(
			`${config.apiUrl}/api/v1/search-source-connectors/${id}`,
			(init) => ({
				...init,
				method: "DELETE",
			})
		);

export const indexConnector =
	(request: ICallableRequestBuilder<IndexConnectorResponse>) =>
	async (params: IndexConnectorRequest): Promise<IndexConnectorResponse> => {
		const queryParams = new URLSearchParams({
			search_space_id: params.search_space_id.toString(),
		});

		if (params.start_date) {
			queryParams.append("start_date", params.start_date);
		}
		if (params.end_date) {
			queryParams.append("end_date", params.end_date);
		}

		return request.call(
			`${config.apiUrl}/api/v1/search-source-connectors/${params.connector_id}/index?${queryParams.toString()}`,
			(init) => ({
				...init,
				method: "POST",
			})
		);
	};
