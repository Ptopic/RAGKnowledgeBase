import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createSearchSpace,
	deleteSearchSpace,
	getSearchSpace,
	getSearchSpaces,
} from "./requests";

const searchSpacesClientRequests = {
	getSearchSpaces: withAuthenticatedClientRequest(getSearchSpaces),
	getSearchSpace: withAuthenticatedClientRequest(getSearchSpace),
	createSearchSpace: withAuthenticatedClientRequest(createSearchSpace),
	deleteSearchSpace: withAuthenticatedClientRequest(deleteSearchSpace),
};

export default searchSpacesClientRequests;
