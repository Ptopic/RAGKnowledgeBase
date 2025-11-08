'use client';

import { queryClientDefaultOptions } from '@shared/queryClient';
import {
   QueryClient,
   QueryClientProvider,
} from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface IProps {
   children: ReactNode;
}

const ReactQueryProvider = ({ children }: IProps) => {
   const [client] = useState(
      () => new QueryClient({ ...queryClientDefaultOptions })
   );

   return (
      <QueryClientProvider client={client}>
         {children}
         {/* <ReactQueryDevtools /> */}
      </QueryClientProvider>
   );
};

export default ReactQueryProvider;
