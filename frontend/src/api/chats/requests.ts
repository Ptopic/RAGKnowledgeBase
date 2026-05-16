import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	Chat,
	ChatDetails,
	CreateChatRequest,
	CreateChatResponse,
	GetChatsParams,
	GetFavoriteChatsParams,
	ToggleFavoriteResponse,
	UpdateChatRequest,
} from "./types";

export const getChats =
	(request: ICallableRequestBuilder<Chat[]>) =>
	async (params: GetChatsParams) =>
		request.call(
			`${config.apiUrl}/chats?search_space_id=${params.search_space_id}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const getChatDetails =
	(request: ICallableRequestBuilder<ChatDetails>) => async (id: number) =>
		request.call(`${config.apiUrl}/chats/${id}`, (init) => ({
			...init,
			method: "GET",
		}));

export const createChat =
	(request: ICallableRequestBuilder<CreateChatResponse>) =>
	async (data: CreateChatRequest) =>
		request.call(`${config.apiUrl}/chats`, (init) => ({
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
		request.call(`${config.apiUrl}/chats/${id}`, (init) => ({
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
		request.call(`${config.apiUrl}/chats/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const addFavoriteChat =
	(request: ICallableRequestBuilder<ToggleFavoriteResponse>) =>
	async (id: number) =>
		request.call(`${config.apiUrl}/chats/${id}/favorite`, (init) => ({
			...init,
			method: "POST",
		}));

export const removeFavoriteChat =
	(request: ICallableRequestBuilder<ToggleFavoriteResponse>) =>
	async (id: number) =>
		request.call(`${config.apiUrl}/chats/${id}/favorite`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getFavoriteChats =
	(request: ICallableRequestBuilder<Chat[]>) =>
	async (params: GetFavoriteChatsParams) =>
		request.call(
			`${config.apiUrl}/chats/favorites?search_space_id=${params.search_space_id}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);
