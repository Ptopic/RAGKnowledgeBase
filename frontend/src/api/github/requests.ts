import type { ICallableRequestBuilder } from "@api/requestBuilder/types";

import config from "@shared/config";
import type { FetchRepositoriesRequest, GithubRepo } from "./types";

export const fetchRepositories =
	(request: ICallableRequestBuilder<GithubRepo[]>) =>
	async (data: FetchRepositoriesRequest) =>
		request.call(`${config.apiUrl}/api/v1/github/repositories`, (init) => ({
			...init,
			method: "POST",
			headers: {
				...init.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		}));
