"use client";

import ReactQueryProvider from "@shared/providers/ReactQueryProvider";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";

interface IProps {
	children: ReactNode;
}

const App = ({ children }: IProps) => {
	return (
		<ReactQueryProvider>
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				enableSystem={false}
				disableTransitionOnChange
			>
				{children}
				<Toaster />
			</ThemeProvider>
		</ReactQueryProvider>
	);
};

export default App;
