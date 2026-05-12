import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	Blog,
	BlogListItem,
	CreateBlogRequest,
	GetBlogsParams,
	UpdateBlogRequest,
} from "./types";

export const getBlogs =
	(request: ICallableRequestBuilder<BlogListItem[]>) =>
	async (params: GetBlogsParams) => {
		const url = new URL(
			`${config.apiUrl}/searchspaces/${params.search_space_id}/blogs`,
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

export const getBlog =
	(request: ICallableRequestBuilder<Blog>) =>
	async (searchSpaceId: number, blogId: number) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/blogs/${blogId}`,
			(init) => ({
				...init,
				method: "GET",
			}),
		);

export const createBlog =
	(request: ICallableRequestBuilder<Blog>) =>
	async (
		searchSpaceId: number,
		data: Omit<CreateBlogRequest, "search_space_id">,
	) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/blogs`,
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

export const updateBlog =
	(request: ICallableRequestBuilder<Blog>) =>
	async (
		searchSpaceId: number,
		blogId: number,
		data: UpdateBlogRequest,
	) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/blogs/${blogId}`,
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

export const deleteBlog =
	(request: ICallableRequestBuilder<void>) =>
	async (searchSpaceId: number, blogId: number) =>
		request.call(
			`${config.apiUrl}/searchspaces/${searchSpaceId}/blogs/${blogId}`,
			(init) => ({
				...init,
				method: "DELETE",
			}),
		);
