import type { ICallableRequestBuilder } from "@api/requestBuilder/types";

import config from "@shared/config";
import type {
	Connector,
	CreateConnectorRequest,
	GetConnectorsParams,
	InitiateOAuthParams,
	OAuthResponse,
	UpdateConnectorRequest,
} from "./types";

export const initiateGoogleCalendarOAuth =
	(request: ICallableRequestBuilder<OAuthResponse>) =>
	async (params: InitiateOAuthParams) =>
		request.call(
			`${config.apiUrl}/api/v1/auth/google/calendar/connector/add/?space_id=${params.space_id}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const initiateGoogleGmailOAuth =
	(request: ICallableRequestBuilder<OAuthResponse>) =>
	async (params: InitiateOAuthParams) =>
		request.call(
			`${config.apiUrl}/api/v1/auth/google/gmail/connector/add/?space_id=${params.space_id}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const createConnector =
	(request: ICallableRequestBuilder<Connector>) =>
	async (data: CreateConnectorRequest) =>
		request.call(
			`${config.apiUrl}/api/v1/search-source-connectors`,
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

export const getConnectors =
	(request: ICallableRequestBuilder<Connector[]>) =>
	async (params?: GetConnectorsParams) => {
		const skip = params?.skip ?? 0;
		const limit = params?.limit ?? 100;
		return request.call(
			`${config.apiUrl}/api/v1/search-source-connectors?skip=${skip}&limit=${limit}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);
	};

export const getConnector =
	(request: ICallableRequestBuilder<Connector>) => async (id: number) =>
		request.call(
			`${config.apiUrl}/api/v1/search-source-connectors/${id}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const updateConnector =
	(request: ICallableRequestBuilder<Connector>) =>
	async (id: number, data: UpdateConnectorRequest) =>
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
			}),
		);

export const deleteConnector =
	(request: ICallableRequestBuilder<void>) => async (id: number) =>
		request.call(
			`${config.apiUrl}/api/v1/search-source-connectors/${id}`,
			(init) => ({
				...init,
				method: "DELETE",
			}),
		);
