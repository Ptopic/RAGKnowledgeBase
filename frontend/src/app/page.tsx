import HomePage from '@features/home/HomePage';
import { COOKIE_NAME } from '@shared/constants';
import { getSSRQueryClient } from '@shared/queryClient';
import { getCookie, getMetadataTitle, HOME } from '@shared/utils';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { openGraphImage } from 'metadata/openGraphImage';
import { Metadata, ResolvingMetadata } from 'next';

export async function generateMetadata(
   {},
   parent: ResolvingMetadata
): Promise<Metadata> {
   const parentOpengraphUrl = (await parent).openGraph?.url;

   return {
      title: getMetadataTitle('Home'),
      openGraph: {
         title: getMetadataTitle('Home'),
         url: `${parentOpengraphUrl}${HOME}`,
         ...openGraphImage,
      },
   };
}

const Home = async () => {
   const queryClient = getSSRQueryClient();

   const dehydratedState = dehydrate(queryClient);

   const cookie = await getCookie(COOKIE_NAME.ACCESS_TOKEN);
   console.log(cookie);
   return (
      <HydrationBoundary state={dehydratedState}>
         <HomePage />
      </HydrationBoundary>
   );
};

export default Home;
