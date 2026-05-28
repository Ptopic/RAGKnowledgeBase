import ScrollToTop from "@components/ScrollToTop";
import NextTopLoader from "nextjs-toploader";
import { twMerge } from "tailwind-merge";

import metadataConfig from "../metadata";
import App from "./App";
import { exo, spaceGrotesk, spaceMono } from "./fonts";
import "./globals.css";

export const metadata = metadataConfig;

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){var k='chunk-load-retried';window.addEventListener('error',function(e){if(e.message&&/loading chunk/i.test(e.message)&&!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');window.location.reload()}});window.addEventListener('unhandledrejection',function(e){var m=e.reason&&(e.reason.message||e.reason.name||'');if(/loading chunk|ChunkLoadError/i.test(m)&&!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');window.location.reload()}}})();`,
					}}
				/>
			</head>
			<body
				id="app"
				className={twMerge(
					spaceGrotesk.variable,
					exo.variable,
					spaceMono.variable,
					"bg-background overscroll-none",
				)}
			>
				<App>
					<NextTopLoader color="#00E1FF" showSpinner={false} />
					<ScrollToTop />
					{children}
				</App>
			</body>
		</html>
	);
}
