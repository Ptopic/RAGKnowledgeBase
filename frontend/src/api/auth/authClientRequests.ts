import {
	withAuthenticatedClientRequest,
	withClientRequest,
} from "@api/requestBuilder/client/withClientRequest";
import {
	forgotPassword,
	getCurrentUser,
	loginWithGoogle,
	loginWithPassword,
	resetPassword,
	signUpWithPassword,
} from "./requests";

const authClientRequests = {
	getCurrentUser: withAuthenticatedClientRequest(getCurrentUser),
	loginWithPassword: withClientRequest(loginWithPassword),
	signUpWithPassword: withClientRequest(signUpWithPassword),
	loginWithGoogle: withClientRequest(loginWithGoogle),
	forgotPassword: withClientRequest(forgotPassword),
	resetPassword: withClientRequest(resetPassword),
};

export default authClientRequests;
