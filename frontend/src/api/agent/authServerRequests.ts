import { withAuthenticatedServerRequest } from '@api/requestBuilder/server/withServerRequest';
import { chat } from './requests';

const agentServerRequests = {
   chat: withAuthenticatedServerRequest(chat),
};

export default agentServerRequests;
