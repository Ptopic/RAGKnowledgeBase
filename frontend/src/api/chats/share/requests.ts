import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type { CreateShareLinkRequest, ShareLink, SharedChat } from "./types";

export const createShareLink =
	(request: ICallableRequestBuilder<ShareLink>) =>
	async (chatId: number, data: CreateShareLinkRequest) =>
		request.call(`${config.apiUrl}/chats/${chatId}/share`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const getChatShareLinks =
	(request: ICallableRequestBuilder<ShareLink[]>) =>
	async (chatId: number) =>
		request.call(`${config.apiUrl}/chats/${chatId}/share`, (init) => ({
			...init,
			method: "GET",
		}));

export const deactivateAllShareLinks =
	(request: ICallableRequestBuilder<void>) =>
	async (chatId: number) =>
		request.call(`${config.apiUrl}/chats/${chatId}/share`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const deactivateShareLink =
	(request: ICallableRequestBuilder<void>) =>
	async (chatId: number, linkId: string) =>
		request.call(`${config.apiUrl}/chats/${chatId}/share/${linkId}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getSharedChat =
	(request: ICallableRequestBuilder<SharedChat>) =>
	async (slug: string) =>
		request.call(`${config.apiUrl}/s/${slug}`, (init) => ({
			...init,
			method: "GET",
		}));
