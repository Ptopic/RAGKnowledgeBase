import { withAuthenticatedClientRequest } from '@api/requestBuilder/client/withClientRequest';
import { chat } from './requests';

const agentClientRequests = {
   chat: withAuthenticatedClientRequest(chat),
};

export default agentClientRequests;
