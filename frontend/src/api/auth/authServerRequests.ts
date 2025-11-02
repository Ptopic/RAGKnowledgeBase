import { withAuthenticatedServerRequest } from '@api/requestBuilder/server/withServerRequest';
import { getCurrentUser } from './requests';

const authServerRequests = {
  getCurrentUser: async () => {
    try {
      const response = await withAuthenticatedServerRequest(getCurrentUser)();
      return response;
    } catch (e) {
      return null;
    }
  },
};

export default authServerRequests;
