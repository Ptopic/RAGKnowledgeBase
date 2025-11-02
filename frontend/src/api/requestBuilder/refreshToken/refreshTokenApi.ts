import { IAuthResponse } from '@api/auth/types';

export const refreshDomainToken = async (
   refreshTokenData: string
): Promise<IAuthResponse> => {
   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenData }),
      cache: 'no-store',
   });

   if (res.status >= 400) {
      let error;

      try {
         error = await res.json();
      } catch {
         throw Error('An error occurred', {
            cause: res,
         });
      }

      throw Error(error.message, {
         cause: res,
      });
   }

   return await res.json();
};
