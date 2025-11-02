import HomePage from "@features/home/HomePage";
import { getSSRQueryClient } from "@shared/queryClient";
import { getMetadataTitle, HOME } from "@shared/utils";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { openGraphImage } from "metadata/openGraphImage";
import type { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
	parent: ResolvingMetadata,
): Promise<Metadata> {
	const parentOpengraphUrl = (await parent).openGraph?.url;

	return {
		title: getMetadataTitle("Home"),
		openGraph: {
			title: getMetadataTitle("Home"),
			url: `${parentOpengraphUrl}${HOME}`,
			...openGraphImage,
		},
	};
}

const Home = async () => {
	const queryClient = getSSRQueryClient();

	const dehydratedState = dehydrate(queryClient);

	return (
		<HydrationBoundary state={dehydratedState}>
			<HomePage />
		</HydrationBoundary>
	);
};

export default Home;
