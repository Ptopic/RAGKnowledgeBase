import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createLLMConfig,
	deleteLLMConfig,
	getLLMConfigs,
	getLLMPreferences,
	updateLLMConfig,
	updateLLMPreferences,
} from "./requests";

const llmConfigsClientRequests = {
	getLLMConfigs: withAuthenticatedClientRequest(getLLMConfigs),
	createLLMConfig: withAuthenticatedClientRequest(createLLMConfig),
	updateLLMConfig: withAuthenticatedClientRequest(updateLLMConfig),
	deleteLLMConfig: withAuthenticatedClientRequest(deleteLLMConfig),
	getLLMPreferences: withAuthenticatedClientRequest(getLLMPreferences),
	updateLLMPreferences: withAuthenticatedClientRequest(updateLLMPreferences),
};

export default llmConfigsClientRequests;
