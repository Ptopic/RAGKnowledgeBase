import { withAuthenticatedClientRequest } from '@api/requestBuilder/client/withClientRequest';
import {
  getCurrentUser,
  loginWithPassword,
  signUpWithPassword,
} from './requests';

const authClientRequests = {
  getCurrentUser: withAuthenticatedClientRequest(getCurrentUser),
  loginWithPassword: withAuthenticatedClientRequest(loginWithPassword),
  signUpWithPassword: withAuthenticatedClientRequest(signUpWithPassword),
};

export default authClientRequests;
