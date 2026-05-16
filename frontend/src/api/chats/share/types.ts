export interface CreateShareLinkRequest {
	expiresInDays?: number;
}

export interface ShareLink {
	id: string;
	slug: string;
	url: string;
	expiresAt: string | null;
	isActive: boolean;
	createdAt: string;
}

export interface SharedChat {
	id: number;
	type: string;
	title: string;
	messages: any[];
	created_at: string;
}
