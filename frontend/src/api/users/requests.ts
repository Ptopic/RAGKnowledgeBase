import type { ICallableRequestBuilder } from "@api/requestBuilder/types";
import config from "@shared/config";
import type { User } from "./types";

export const getCurrentUser =
	(request: ICallableRequestBuilder<User>) => async (): Promise<User> =>
		request.call(`${config.apiUrl}/users/me`, (init) => ({
			...init,
			method: "GET",
		}));
