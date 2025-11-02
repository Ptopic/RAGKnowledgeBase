export interface FetchRepositoriesRequest {
	github_pat: string;
}

export interface GithubRepo {
	id: number;
	name: string;
	full_name: string;
	private: boolean;
	url: string;
	description: string | null;
	last_updated: string | null;
}
