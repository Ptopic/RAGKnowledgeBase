import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	CreateSearchSpaceRequest,
	CreateSearchSpaceResponse,
	InviteMemberRequest,
	InviteResponse,
	Member,
	SearchSpace,
	UpdateMemberRoleRequest,
} from "./types";

export const getSearchSpaces =
	(request: ICallableRequestBuilder<SearchSpace[]>) =>
	async (): Promise<SearchSpace[]> =>
		request.call(`${config.apiUrl}/searchspaces`, (init) => ({
			...init,
			method: "GET",
		}));

export const getSearchSpace =
	(request: ICallableRequestBuilder<SearchSpace>) =>
	async (id: number): Promise<SearchSpace> =>
		request.call(`${config.apiUrl}/searchspaces/${id}`, (init) => ({
			...init,
			method: "GET",
		}));

export const createSearchSpace =
	(request: ICallableRequestBuilder<CreateSearchSpaceResponse>) =>
	async (data: CreateSearchSpaceRequest) =>
		request.call(`${config.apiUrl}/searchspaces`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const deleteSearchSpace =
	(request: ICallableRequestBuilder<void>) => async (id: number) =>
		request.call(`${config.apiUrl}/searchspaces/${id}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const getMembers =
	(request: ICallableRequestBuilder<Member[]>) =>
	async (searchSpaceId: number): Promise<Member[]> =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/members`, (init) => ({
			...init,
			method: "GET",
		}));

export const inviteMember =
	(request: ICallableRequestBuilder<InviteResponse>) =>
	async (searchSpaceId: number, data: InviteMemberRequest): Promise<InviteResponse> =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/members`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const updateMemberRole =
	(request: ICallableRequestBuilder<Member>) =>
	async (searchSpaceId: number, memberId: string, data: UpdateMemberRoleRequest): Promise<Member> =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/members/${memberId}`, (init) => ({
			...init,
			method: "PUT",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));

export const removeMember =
	(request: ICallableRequestBuilder<void>) =>
	async (searchSpaceId: number, memberId: string): Promise<void> =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/members/${memberId}`, (init) => ({
			...init,
			method: "DELETE",
		}));

export const leaveSearchSpace =
	(request: ICallableRequestBuilder<void>) =>
	async (searchSpaceId: number): Promise<void> =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/members/leave`, (init) => ({
			...init,
			method: "DELETE",
		}));
