import { NextRequest } from 'next/server';

export const config = {
   matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
   // const accessToken = getCookie(COOKIE_NAME.ACCESS_TOKEN);
   // const { pathname } = request.nextUrl;
   // let user = null;
   //   if (accessToken) {
   //     try {
   //       user = await authServerRequests.getCurrentUser();
   //     } catch (e) {
   //       console.log(e);
   //     }
   //   }
   // if (user) {
   //   return handleAuthenticatedRequest(pathname, request.url);
   // } else {
   //   return handleUnauthenticatedRequest(pathname, request.url);
   // }
}

// const handleAuthenticatedRequest = (pathname: string, url: string) => {
//    if (pathname === LOGIN || pathname === SIGN_UP) {
//       return NextResponse.redirect(new URL('/', url));
//    }
// };

// const handleUnauthenticatedRequest = (pathname: string, url: string) => {
//    if (pathname !== LOGIN && pathname !== SIGN_UP) {
//       return NextResponse.redirect(new URL(LOGIN, url));
//    }
// };
