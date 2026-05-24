import type { ICallableRequestBuilder } from "@requestBuilder/types";

import config from "@shared/config";
import type {
	AcceptInvitationRequest,
	CreateInvitationRequest,
	CreateSearchSpaceRequest,
	CreateSearchSpaceResponse,
	DeclineInvitationRequest,
	InviteMemberRequest,
	InviteResponse,
	Member,
	SearchSpace,
	SearchSpaceInvitation,
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

export const createInvitation =
	(request: ICallableRequestBuilder<SearchSpaceInvitation>) =>
	async (searchSpaceId: number, data: CreateInvitationRequest) =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/invitations`, (init) => ({
			...init,
			method: "POST",
			headers: { ...init.headers, "Content-Type": "application/json" },
			body: JSON.stringify(data),
		}));

export const getInvitationByToken =
	(request: ICallableRequestBuilder<SearchSpaceInvitation>) =>
	async (token: string) =>
		request.call(`${config.apiUrl}/searchspaces/invite/${token}`);

export const acceptInvitation =
	(request: ICallableRequestBuilder<{ message: string }>) =>
	async (data: AcceptInvitationRequest) =>
		request.call(`${config.apiUrl}/searchspaces/invite/${data.token}/accept`, (init) => ({
			...init,
			method: "POST",
		}));

export const declineInvitation =
	(request: ICallableRequestBuilder<{ message: string }>) =>
	async (data: DeclineInvitationRequest) =>
		request.call(`${config.apiUrl}/searchspaces/invite/${data.token}/decline`, (init) => ({
			...init,
			method: "POST",
		}));

export const getMyInvitations =
	(request: ICallableRequestBuilder<SearchSpaceInvitation[]>) =>
	async () =>
		request.call(`${config.apiUrl}/searchspaces/invitations`);

export const getPendingInvitations =
	(request: ICallableRequestBuilder<SearchSpaceInvitation[]>) =>
	async (searchSpaceId: number): Promise<SearchSpaceInvitation[]> =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/invitations/pending`, (init) => ({
			...init,
			method: "GET",
		}));

export const cancelInvitation =
	(request: ICallableRequestBuilder<{ message: string }>) =>
	async (searchSpaceId: number, invitationId: number): Promise<{ message: string }> =>
		request.call(`${config.apiUrl}/searchspaces/${searchSpaceId}/invitations/${invitationId}`, (init) => ({
			...init,
			method: "DELETE",
		}));
