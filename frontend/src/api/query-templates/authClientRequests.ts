import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createGlobalQueryTemplate,
	createSearchSpaceQueryTemplate,
	deleteGlobalQueryTemplate,
	deleteSearchSpaceQueryTemplate,
	getGlobalQueryTemplates,
	getSearchSpaceQueryTemplates,
	updateGlobalQueryTemplate,
} from "./requests";

const queryTemplatesClientRequests = {
	getGlobalQueryTemplates: withAuthenticatedClientRequest(getGlobalQueryTemplates),
	createGlobalQueryTemplate: withAuthenticatedClientRequest(createGlobalQueryTemplate),
	updateGlobalQueryTemplate: withAuthenticatedClientRequest(updateGlobalQueryTemplate),
	deleteGlobalQueryTemplate: withAuthenticatedClientRequest(deleteGlobalQueryTemplate),
	getSearchSpaceQueryTemplates: withAuthenticatedClientRequest(getSearchSpaceQueryTemplates),
	createSearchSpaceQueryTemplate: withAuthenticatedClientRequest(createSearchSpaceQueryTemplate),
	deleteSearchSpaceQueryTemplate: withAuthenticatedClientRequest(deleteSearchSpaceQueryTemplate),
};

export default queryTemplatesClientRequests;
