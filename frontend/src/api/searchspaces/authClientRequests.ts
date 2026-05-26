import {
	withAuthenticatedClientRequest,
	withClientRequest,
} from "@api/requestBuilder/client/withClientRequest";
import {
	acceptInvitation,
	cancelInvitation,
	createInvitation,
	createSearchSpace,
	declineInvitation,
	deleteSearchSpace,
	deleteSearchSpaceImage,
	getInvitationByToken,
	getMembers,
	getMyInvitations,
	getPendingInvitations,
	getSearchSpace,
	getSearchSpaces,
	inviteMember,
	leaveSearchSpace,
	removeMember,
	updateMemberRole,
	updateSearchSpace,
	uploadSearchSpaceImage,
} from "./requests";

const searchSpacesClientRequests = {
	getSearchSpaces: withAuthenticatedClientRequest(getSearchSpaces),
	getSearchSpace: withAuthenticatedClientRequest(getSearchSpace),
	createSearchSpace: withAuthenticatedClientRequest(createSearchSpace),
	deleteSearchSpace: withAuthenticatedClientRequest(deleteSearchSpace),
	updateSearchSpace: withAuthenticatedClientRequest(updateSearchSpace),
	uploadSearchSpaceImage: withAuthenticatedClientRequest(uploadSearchSpaceImage),
	deleteSearchSpaceImage: withAuthenticatedClientRequest(deleteSearchSpaceImage),
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
	getPendingInvitations: withAuthenticatedClientRequest(getPendingInvitations),
	cancelInvitation: withAuthenticatedClientRequest(cancelInvitation),
};

export default searchSpacesClientRequests;
