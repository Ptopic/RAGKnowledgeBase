import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createGlobalQueryTemplate,
	createSearchSpaceQueryTemplate,
	deleteGlobalQueryTemplate,
	deleteSearchSpaceQueryTemplate,
	getGlobalQueryTemplates,
	getSearchSpaceQueryTemplates,
	pinQueryTemplate,
	unpinQueryTemplate,
	updateGlobalQueryTemplate,
	updateSearchSpaceQueryTemplate,
} from "./requests";

const queryTemplatesClientRequests = {
	getGlobalQueryTemplates: withAuthenticatedClientRequest(getGlobalQueryTemplates),
	createGlobalQueryTemplate: withAuthenticatedClientRequest(createGlobalQueryTemplate),
	updateGlobalQueryTemplate: withAuthenticatedClientRequest(updateGlobalQueryTemplate),
	deleteGlobalQueryTemplate: withAuthenticatedClientRequest(deleteGlobalQueryTemplate),
	getSearchSpaceQueryTemplates: withAuthenticatedClientRequest(getSearchSpaceQueryTemplates),
	createSearchSpaceQueryTemplate: withAuthenticatedClientRequest(createSearchSpaceQueryTemplate),
	updateSearchSpaceQueryTemplate: withAuthenticatedClientRequest(updateSearchSpaceQueryTemplate),
	deleteSearchSpaceQueryTemplate: withAuthenticatedClientRequest(deleteSearchSpaceQueryTemplate),
	pinQueryTemplate: withAuthenticatedClientRequest(pinQueryTemplate),
	unpinQueryTemplate: withAuthenticatedClientRequest(unpinQueryTemplate),
};

export default queryTemplatesClientRequests;
