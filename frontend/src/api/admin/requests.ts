import type { ICallableRequestBuilder } from "@requestBuilder/types";
import config from "@shared/config";
import type {
	AdminMetrics,
	AdminUser,
	AdminUserList,
	CreateAdminUser,
	UpdateAdminUser,
} from "./types";

export const getAdminUsers =
	(request: ICallableRequestBuilder<AdminUserList>) =>
	async (params: {
		skip?: number;
		limit?: number;
		search?: string;
	}): Promise<AdminUserList> => {
		const searchParams = new URLSearchParams();
		if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
		if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
		if (params.search) searchParams.set("search", params.search);
		const qs = searchParams.toString();
		const url = `${config.apiUrl}/admin/users${qs ? `?${qs}` : ""}`;
		return request.call(url, (init) => ({
			...init,
			method: "GET",
		}));
	};

export const createAdminUser =
	(request: ICallableRequestBuilder<AdminUser>) =>
	async (data: CreateAdminUser): Promise<AdminUser> =>
		request.call(`${config.apiUrl}/admin/users`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const updateAdminUser =
	(request: ICallableRequestBuilder<AdminUser>) =>
	async (id: string, data: UpdateAdminUser): Promise<AdminUser> =>
		request.call(`${config.apiUrl}/admin/users/${id}`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteAdminUser =
	(request: ICallableRequestBuilder<{ message: string }>) =>
	async (id: string): Promise<{ message: string }> =>
		request.call(`${config.apiUrl}/admin/users/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const toggleAdminUserActive =
	(request: ICallableRequestBuilder<AdminUser>) =>
	async (id: string): Promise<AdminUser> =>
		request.call(`${config.apiUrl}/admin/users/${id}/toggle-active`, (init) => ({
			...init,
			method: "PUT",
		}));

export const getAdminMetrics =
	(request: ICallableRequestBuilder<AdminMetrics>) =>
	async (params: {
		skip?: number;
		limit?: number;
		search?: string;
	}): Promise<AdminMetrics> => {
		const searchParams = new URLSearchParams();
		if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
		if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
		if (params.search) searchParams.set("search", params.search);
		const qs = searchParams.toString();
		const url = `${config.apiUrl}/admin/metrics${qs ? `?${qs}` : ""}`;
		return request.call(url, (init) => ({
			...init,
			method: "GET",
		}));
	};
