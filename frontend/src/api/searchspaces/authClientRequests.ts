import { withAuthenticatedClientRequest, withClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	acceptInvitation,
	createInvitation,
	createSearchSpace,
	declineInvitation,
	deleteSearchSpace,
	getInvitationByToken,
	getMembers,
	getMyInvitations,
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
	createInvitation: withAuthenticatedClientRequest(createInvitation),
	getInvitationByToken: withClientRequest(getInvitationByToken),
	acceptInvitation: withAuthenticatedClientRequest(acceptInvitation),
	declineInvitation: withAuthenticatedClientRequest(declineInvitation),
	getMyInvitations: withAuthenticatedClientRequest(getMyInvitations),
};

export default searchSpacesClientRequests;
