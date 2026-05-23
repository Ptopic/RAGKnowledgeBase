import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createSearchSpace,
	deleteSearchSpace,
	getMembers,
	getSearchSpace,
	getSearchSpaces,
	inviteMember,
	leaveSearchSpace,
	removeMember,
	updateMemberRole,
} from "./requests";

const searchSpacesClientRequests = {
	getSearchSpaces: withAuthenticatedClientRequest(getSearchSpaces),
	getSearchSpace: withAuthenticatedClientRequest(getSearchSpace),
	createSearchSpace: withAuthenticatedClientRequest(createSearchSpace),
	deleteSearchSpace: withAuthenticatedClientRequest(deleteSearchSpace),
	getMembers: withAuthenticatedClientRequest(getMembers),
	inviteMember: withAuthenticatedClientRequest(inviteMember),
	updateMemberRole: withAuthenticatedClientRequest(updateMemberRole),
	removeMember: withAuthenticatedClientRequest(removeMember),
	leaveSearchSpace: withAuthenticatedClientRequest(leaveSearchSpace),
};

export default searchSpacesClientRequests;
