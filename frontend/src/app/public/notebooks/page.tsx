import { Suspense } from "react";
import PublicNotebooksClient from "./public-notebooks-client";

export const metadata = {
	title: "Published Notebooks",
	description: "Browse published notebooks",
};

export default function PublicNotebooksPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-screen">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
				</div>
			}
		>
			<PublicNotebooksClient />
		</Suspense>
	);
}
