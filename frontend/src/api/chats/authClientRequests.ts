import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	addFavoriteChat,
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
};

export default chatsClientRequests;
