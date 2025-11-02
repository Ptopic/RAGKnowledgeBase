'use client';

import { ReactNode } from 'react';

import ReactQueryProvider from '@shared/providers/ReactQueryProvider';

interface IProps {
  children: ReactNode;
}

const App = ({ children }: IProps) => {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
};

export default App;
