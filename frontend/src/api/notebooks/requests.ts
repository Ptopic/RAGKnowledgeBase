import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	Notebook,
	NotebookListItem,
	CreateNotebookRequest,
	GetNotebooksParams,
	UpdateNotebookRequest,
	UploadNotebookImageRequest,
	UploadNotebookImageResponse,
	DeleteNotebookImageRequest,
} from "./types";

export const getNotebooks =
	(request: ICallableRequestBuilder<NotebookListItem[]>) =>
	async (params: GetNotebooksParams) => {
		const url = new URL(
			`${config.apiUrl}/searchspaces/${params.search_space_id}/notebooks`,
		);
		if (params.skip !== undefined)
			url.searchParams.append("skip", params.skip.toString());
		if (params.limit !== undefined)
			url.searchParams.append("limit", params.limit.toString());
		return request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
	};

export const getNotebook =
	(request: ICallableRequestBuilder<Notebook>) =>
	async (searchSpaceId: number, notebookId: number) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/notebooks/${notebookId}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const createNotebook =
	(request: ICallableRequestBuilder<Notebook>) =>
	async (
		searchSpaceId: number,
		data: Omit<CreateNotebookRequest, "search_space_id">,
	) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/notebooks`,
			(init) => ({
				...init,
				method: "POST",
				headers: {
					...init.headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ...data, search_space_id: searchSpaceId }),
			}),
		);

export const updateNotebook =
	(request: ICallableRequestBuilder<Notebook>) =>
	async (
		searchSpaceId: number,
		notebookId: number,
		data: UpdateNotebookRequest,
	) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/notebooks/${notebookId}`,
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

export const deleteNotebook =
	(request: ICallableRequestBuilder<{ message: string }>) =>
	async (searchSpaceId: number, notebookId: number) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/notebooks/${notebookId}`,
			(init) => ({
				...init,
				method: "DELETE",
			}),
		);

export const uploadNotebookImage =
	(request: ICallableRequestBuilder<UploadNotebookImageResponse>) =>
	async (data: UploadNotebookImageRequest) => {
		const formData = new FormData();
		formData.append("file", data.file);

		return request.call(
			`${config.apiUrl}/searchspaces/${data.searchSpaceId}/notebooks/upload-image`,
			(init) => {
				// For FormData, don't set Content-Type - browser will set it automatically with boundary
				const headers = new Headers(init.headers);
				headers.delete("Content-Type");
				headers.delete("content-type");

				return {
					...init,
					method: "POST",
					headers,
					body: formData,
				};
			},
		);
	};

export const deleteNotebookImage =
	(request: ICallableRequestBuilder<{ message: string }>) =>
	async (data: DeleteNotebookImageRequest) =>
		request.call(
			`${config.apiUrl}/searchspaces/${data.searchSpaceId}/notebooks/delete-image`,
			(init) => ({
				...init,
				method: "DELETE",
				headers: {
					...init.headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: data.url }),
			}),
		);
