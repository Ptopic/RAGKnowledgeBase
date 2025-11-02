import { IAuthResponse } from '@api/auth/types';
import { refreshDomainToken } from '@api/requestBuilder/refreshToken/refreshTokenApi';

import { COOKIE_NAME } from '@shared/constants/cookies';
import { removeAuthTokens, setAuthTokens } from '@shared/utils/auth';
import { getCookie } from '@shared/utils/cookie';

class RefreshTokenManager {
   private static instance: RefreshTokenManager;
   private refreshRequest?: Promise<IAuthResponse | undefined>;

   static getInstance() {
      if (!this.instance) {
         this.instance = new RefreshTokenManager();
      }
      return this.instance;
   }

   async refreshTokens(calculatedUrl: string) {
      if (!this.refreshRequest) {
         this.refreshRequest = this.executeRefreshTokensRequest(calculatedUrl);
      }

      return this.refreshRequest;
   }

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   private async executeRefreshTokensRequest(calculatedUrl: string) {
      const refreshToken = await getCookie(COOKIE_NAME.REFRESH_TOKEN);
      if (!refreshToken) return;

      try {
         const response = await refreshDomainToken(refreshToken);
         await setAuthTokens(response);

         return response;
      } catch (e) {
         await removeAuthTokens();
         // window.location.href = calculatedUrl.includes('admin') ? LOGIN : LOGIN;

         throw e;
      } finally {
         this.refreshRequest = undefined;
      }
   }
}

export default RefreshTokenManager;
