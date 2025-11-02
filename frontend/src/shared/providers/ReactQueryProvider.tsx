'use client';

import { queryClientDefaultOptions } from '@shared/queryClient';
import {
   HydrationBoundary,
   QueryClient,
   QueryClientProvider,
   dehydrate,
} from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface IProps {
   children: ReactNode;
}

const ReactQueryProvider = ({ children }: IProps) => {
   const [client] = useState(
      () => new QueryClient({ ...queryClientDefaultOptions })
   );

   const dehydratedState = dehydrate(client, {
      shouldDehydrateQuery: () => true,
   });

   return (
      <QueryClientProvider client={client}>
         <HydrationBoundary state={dehydratedState}>
            {children}
         </HydrationBoundary>
         {/* <ReactQueryDevtools /> */}
      </QueryClientProvider>
   );
};

export default ReactQueryProvider;
