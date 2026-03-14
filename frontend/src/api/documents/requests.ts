import type { ICallableRequestBuilder } from "@requestBuilder/types";
import config from "@shared/config";
import { normalizeListResponse } from "@/lib/pagination";
import type {
	AddYouTubeVideosRequest,
	AddYouTubeVideosResponse,
	CrawlWebpagesRequest,
	CrawlWebpagesResponse,
	Document,
	DocumentWithChunks,
	GetDocumentsParams,
	GetDocumentTypeCountsParams,
	ListResponse,
	SearchDocumentsParams,
	UploadDocumentsRequest,
	UploadDocumentsResponse,
} from "./types";

export const uploadDocuments =
	(request: ICallableRequestBuilder<UploadDocumentsResponse>) =>
	async (data: UploadDocumentsRequest) => {
		const formData = new FormData();
		data.files.forEach((file) => {
			formData.append("files", file);
		});
		formData.append("search_space_id", data.search_space_id);

		return request.call(
			`${config.apiUrl}/documents/fileupload`,
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

export const crawlWebpages =
	(request: ICallableRequestBuilder<CrawlWebpagesResponse>) =>
	async (data: CrawlWebpagesRequest) =>
		request.call(`${config.apiUrl}/documents`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const addYouTubeVideos =
	(request: ICallableRequestBuilder<AddYouTubeVideosResponse>) =>
	async (data: AddYouTubeVideosRequest) =>
		request.call(`${config.apiUrl}/documents`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const getDocumentByChunk =
	(request: ICallableRequestBuilder<DocumentWithChunks>) =>
	async (chunkId: number) =>
		request.call(
			`${config.apiUrl}/documents/by-chunk/${chunkId}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const getDocumentWithChunks =
	(request: ICallableRequestBuilder<DocumentWithChunks>) =>
	async (documentId: number) =>
		request.call(`${config.apiUrl}/documents/${documentId}/chunks`, (init) => ({
			...init,
			method: "GET",
		}));

export const getDocuments =
	(request: ICallableRequestBuilder<unknown>) =>
	async (params: GetDocumentsParams): Promise<ListResponse<Document>> => {
		const url = new URL(`${config.apiUrl}/documents`);
		url.searchParams.append(
			"search_space_id",
			params.search_space_id.toString(),
		);
		if (params.page !== undefined) {
			url.searchParams.append("page", params.page.toString());
		}
		if (params.page_size !== undefined) {
			url.searchParams.append("page_size", params.page_size.toString());
		}
		if (params.document_types && params.document_types.length > 0) {
			url.searchParams.append(
				"document_types",
				params.document_types.join(","),
			);
		}
		const data = await request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
		return normalizeListResponse<Document>(data);
	};

export const searchDocuments =
	(request: ICallableRequestBuilder<unknown>) =>
	async (params: SearchDocumentsParams): Promise<ListResponse<Document>> => {
		const url = new URL(`${config.apiUrl}/documents/search`);
		url.searchParams.append(
			"search_space_id",
			params.search_space_id.toString(),
		);
		url.searchParams.append("title", params.title);
		if (params.page !== undefined) {
			url.searchParams.append("page", params.page.toString());
		}
		if (params.page_size !== undefined) {
			url.searchParams.append("page_size", params.page_size.toString());
		}
		if (params.document_types && params.document_types.length > 0) {
			url.searchParams.append(
				"document_types",
				params.document_types.join(","),
			);
		}
		const data = await request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
		return normalizeListResponse<Document>(data);
	};

export const deleteDocument =
	(request: ICallableRequestBuilder<void>) => async (id: number) =>
		request.call(`${config.apiUrl}/documents/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getDocumentTypeCounts =
	(request: ICallableRequestBuilder<Record<string, number>>) =>
	async (params?: GetDocumentTypeCountsParams) => {
		const url = new URL(`${config.apiUrl}/documents/type-counts`);
		if (params?.search_space_id !== undefined) {
			url.searchParams.append(
				"search_space_id",
				params.search_space_id.toString(),
			);
		}
		return request.call(url.toString(), (init) => ({
			...init,
			method: "GET",
		}));
	};
