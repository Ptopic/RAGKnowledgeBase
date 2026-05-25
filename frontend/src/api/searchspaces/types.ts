export type MemberRole = "OWNER" | "EDITOR" | "VIEWER";

export interface SearchSpace {
	id: number;
	name: string;
	description: string;
	created_at: string;
	user_id: string;
	pinned_query_template_ids: number[];
	role: MemberRole | null;
	is_owner: boolean;
}

export interface CreateSearchSpaceRequest {
	name: string;
	description: string;
}

export interface CreateSearchSpaceResponse extends SearchSpace {}

export interface UpdateSearchSpaceRequest {
	name: string;
	description?: string;
}

export interface UpdateSearchSpaceResponse extends SearchSpace {}

export interface Member {
	id: string;
	user_id: string;
	email: string;
	full_name: string | null;
	picture: string | null;
	role: MemberRole;
	invited_by_id: string;
	created_at: string;
}

export interface InviteMemberRequest {
	email: string;
	role: MemberRole;
}

export interface InviteResponse {
	message: string;
}

export interface UpdateMemberRoleRequest {
	role: MemberRole;
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface SearchSpaceInvitation {
	id: number;
	searchSpaceId: number;
	inviterId: string;
	inviteeEmail: string;
	status: InvitationStatus;
	expiresAt: string;
	createdAt: string;
	searchSpaceName?: string;
	inviterName?: string;
}

export interface CreateInvitationRequest {
	inviteeEmail: string;
}

export interface AcceptInvitationRequest {
	token: string;
}

export interface DeclineInvitationRequest {
	token: string;
}

export interface SearchSpaceMember {
	id: string;
	userId: string;
	searchSpaceId: number;
	role: string;
	createdAt: string;
	user?: {
		id: string;
		email: string;
		fullName: string | null;
		picture: string | null;
	};
}
