import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import { fetchRepositories } from "./requests";

const githubClientRequests = {
	fetchRepositories: withAuthenticatedClientRequest(fetchRepositories),
};

export default githubClientRequests;
