import type { ICallableRequestBuilder } from "@api/requestBuilder/types";

import config from "@shared/config";
import type {
	Chat,
	ChatDetails,
	CreateChatRequest,
	CreateChatResponse,
	GetChatsParams,
	UpdateChatRequest,
} from "./types";

export const getChats =
	(request: ICallableRequestBuilder<Chat[]>) =>
	async (params: GetChatsParams) =>
		request.call(
			`${config.apiUrl}/api/v1/chats?search_space_id=${params.search_space_id}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const getChatDetails =
	(request: ICallableRequestBuilder<ChatDetails>) => async (id: number) =>
		request.call(`${config.apiUrl}/api/v1/chats/${id}`, (init) => ({
			...init,
			method: "GET",
		}));

export const createChat =
	(request: ICallableRequestBuilder<CreateChatResponse>) =>
	async (data: CreateChatRequest) =>
		request.call(`${config.apiUrl}/api/v1/chats`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const updateChat =
	(request: ICallableRequestBuilder<void>) =>
	async (id: number, data: UpdateChatRequest) =>
		request.call(`${config.apiUrl}/api/v1/chats/${id}`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteChat =
	(request: ICallableRequestBuilder<void>) => async (id: number) =>
		request.call(`${config.apiUrl}/api/v1/chats/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));
