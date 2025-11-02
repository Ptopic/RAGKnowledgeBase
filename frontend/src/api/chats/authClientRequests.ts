import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createChat,
	deleteChat,
	getChatDetails,
	getChats,
	updateChat,
} from "./requests";

const chatsClientRequests = {
	getChats: withAuthenticatedClientRequest(getChats),
	getChatDetails: withAuthenticatedClientRequest(getChatDetails),
	createChat: withAuthenticatedClientRequest(createChat),
	updateChat: withAuthenticatedClientRequest(updateChat),
	deleteChat: withAuthenticatedClientRequest(deleteChat),
};

export default chatsClientRequests;
