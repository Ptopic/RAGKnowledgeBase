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
