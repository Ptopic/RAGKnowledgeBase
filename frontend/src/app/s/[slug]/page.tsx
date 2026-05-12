import { Suspense } from "react";
import SharedChatClient from "./shared-chat-client";

interface PageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function SharedChatPage({ params }: PageProps) {
	const { slug } = await params;

	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-screen">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
				</div>
			}
		>
			<SharedChatClient slug={slug} />
		</Suspense>
	);
}
