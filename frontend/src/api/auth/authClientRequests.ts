import {
	withAuthenticatedClientRequest,
	withClientRequest,
} from "@api/requestBuilder/client/withClientRequest";
import {
	getCurrentUser,
	loginWithGoogle,
	loginWithPassword,
	signUpWithPassword,
} from "./requests";

const authClientRequests = {
	getCurrentUser: withAuthenticatedClientRequest(getCurrentUser),
	loginWithPassword: withAuthenticatedClientRequest(loginWithPassword),
	signUpWithPassword: withAuthenticatedClientRequest(signUpWithPassword),
	loginWithGoogle: withClientRequest(loginWithGoogle),
};

export default authClientRequests;
