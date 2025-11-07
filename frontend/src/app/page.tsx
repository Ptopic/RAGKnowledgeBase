import HomePage from "@features/home/HomePage";
import { getSSRQueryClient } from "@shared/queryClient";
import { getMetadataTitle, HOME } from "@shared/utils";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { openGraphImage } from "metadata/openGraphImage";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: getMetadataTitle("Home"),
		openGraph: {
			title: getMetadataTitle("Home"),
			url: HOME,
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
