import { IAuthResponse } from '@api/auth/types';
import { config } from '@shared/config/config';
import { COOKIE_NAME } from '@shared/constants/cookies';
import { NextRequest, NextResponse } from 'next/server';

const serverRefreshRequest = async (
   req: NextRequest,
   refreshToken: string,
   redirectUrl: string,
   unauthorizedRedirectUrl: string
) => {
   try {
      const result = await fetch(`${config.apiUrl}/auth/refresh`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({ refreshToken: refreshToken }),
         cache: 'no-store',
      });

      const data = (await result.json()) as IAuthResponse;

      if (data) {
         const response = NextResponse.redirect(redirectUrl);
         response.cookies.set(COOKIE_NAME.ACCESS_TOKEN, data.accessToken, {
            secure: true,
            maxAge: data.expiresIn,
         });
         response.cookies.set(COOKIE_NAME.REFRESH_TOKEN, data.refreshToken, {
            secure: true,
         });
         return response;
      } else {
         throw Error();
      }
   } catch (e) {
      const response = NextResponse.redirect(
         new URL(unauthorizedRedirectUrl, req.url)
      );
      response.cookies.delete(COOKIE_NAME.ACCESS_TOKEN);
      response.cookies.delete(COOKIE_NAME.REFRESH_TOKEN);
      return response;
   }
};

export default serverRefreshRequest;
