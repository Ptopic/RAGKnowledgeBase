import { Suspense } from "react";
import PublicNotebookDetailClient from "./public-notebook-detail-client";

interface PageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({ params }: PageProps) {
	const { slug } = await params;
	return {
		title: `Notebook - ${slug}`,
		description: "View published notebook",
	};
}

export default async function PublicNotebookDetailPage({ params }: PageProps) {
	const { slug } = await params;

	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-screen">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
				</div>
			}
		>
			<PublicNotebookDetailClient slug={slug} />
		</Suspense>
	);
}
