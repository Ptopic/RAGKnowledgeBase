import NextTopLoader from 'nextjs-toploader';

import { twMerge } from 'tailwind-merge';

import ScrollToTop from '@components/ScrollToTop';

import metadataConfig from '../metadata';
import App from './App';
import { exo, spaceGrotesk, spaceMono } from './fonts';
import './globals.css';

export const metadata = metadataConfig;

export default async function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang='en'>
         <body
            id='app'
            className={twMerge(
               spaceGrotesk.variable,
               exo.variable,
               spaceMono.variable,
               'bg-neutral1000 overscroll-none'
            )}
         >
            <App>
               <NextTopLoader color='#00E1FF' showSpinner={false} />
               <ScrollToTop />
               {children}
            </App>
         </body>
      </html>
   );
}
