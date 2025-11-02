import RefreshTokenManager from '@api/requestBuilder/refreshToken/refreshTokenManager';
import { COOKIE_NAME } from '@shared/constants/cookies';
import { removeAuthTokens } from '@shared/utils/auth';
import { getCookie } from 'cookies-next';
import { RequestBuilder } from '../requestBuilder';

export class ClientRequestBuilder<T> extends RequestBuilder<T> {
   constructor(url?: string);
   constructor(
      url?: string,
      requestInit?: RequestInit,
      callback?: (requestInit: RequestInit) => Promise<T>
   ) {
      super(url, requestInit, callback);
   }

   public authenticate() {
      const accessToken = getCookie(COOKIE_NAME.ACCESS_TOKEN)?.toString();

      this.requestInit = {
         ...this.requestInit,
         headers: {
            ...this.requestInit?.headers,
            Authorization: `Bearer ${accessToken}`,
         },
      };

      return this;
   }

   async handleErrors(
      error: any,
      url: string,
      requestInit: RequestInit
   ): Promise<T> {
      if (error instanceof Error) {
         const errorCause = (error as Error).cause as { status: number };
         if (errorCause?.status === 401) {
            const refreshToken = await getCookie(COOKIE_NAME.REFRESH_TOKEN);
            if (refreshToken) {
               return await this.repeatRequestWithNewToken(url, requestInit);
            }

            await removeAuthTokens();
            // window.location.href = url.includes('admin') ? LOGIN : LOGIN;
         }
      }
      throw error;
   }

   private async repeatRequestWithNewToken(
      calculatedUrl: string,
      updatedRequestInit: RequestInit
   ) {
      const authResponse =
         await RefreshTokenManager.getInstance().refreshTokens(calculatedUrl);

      this.requestInit = {
         ...updatedRequestInit,
         headers: {
            ...updatedRequestInit.headers,
            Authorization: `Bearer ${authResponse?.accessToken}`,
         },
      };

      return await this.getResponse(calculatedUrl, this.requestInit);
   }
}
