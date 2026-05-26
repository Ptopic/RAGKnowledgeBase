"use client";

import ReactQueryProvider from "@shared/providers/ReactQueryProvider";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { SSEProvider } from "@/components/providers/SSEProvider";
import { ThemeProvider } from "@/components/theme/theme-provider";

interface IProps {
	children: ReactNode;
}

const App = ({ children }: IProps) => {
	return (
		<ReactQueryProvider>
			<SSEProvider>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem={false}
					disableTransitionOnChange
				>
					{children}
					<Toaster />
				</ThemeProvider>
			</SSEProvider>
		</ReactQueryProvider>
	);
};

export default App;
