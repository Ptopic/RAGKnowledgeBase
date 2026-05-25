import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	addFavoriteChat,
	bulkDeleteChats,
	createChat,
	deleteChat,
	getChatDetails,
	getChats,
	getFavoriteChats,
	removeFavoriteChat,
	updateChat,
} from "./requests";

const chatsClientRequests = {
	getChats: withAuthenticatedClientRequest(getChats),
	getChatDetails: withAuthenticatedClientRequest(getChatDetails),
	createChat: withAuthenticatedClientRequest(createChat),
	updateChat: withAuthenticatedClientRequest(updateChat),
	deleteChat: withAuthenticatedClientRequest(deleteChat),
	addFavoriteChat: withAuthenticatedClientRequest(addFavoriteChat),
	removeFavoriteChat: withAuthenticatedClientRequest(removeFavoriteChat),
	getFavoriteChats: withAuthenticatedClientRequest(getFavoriteChats),
	bulkDeleteChats: withAuthenticatedClientRequest(bulkDeleteChats),
};

export default chatsClientRequests;
