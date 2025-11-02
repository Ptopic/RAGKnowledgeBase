import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import { getCurrentUser } from "./requests";

const usersClientRequests = {
	getCurrentUser: withAuthenticatedClientRequest(getCurrentUser),
};

export default usersClientRequests;
