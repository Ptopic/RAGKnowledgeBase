import { getMetadataTitle, HOME } from "@shared/utils";
import { openGraphImage } from "metadata/openGraphImage";
import type { Metadata } from "next";
import Link from "next/link";

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

const Home = () => {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center px-6 py-12">
				<h1 className="text-6xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
					Welcome Home
				</h1>
				<p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
					Your RAG Knowledge Base is ready to help you manage and explore your
					data.
				</p>
				<Link
					href="/dashboard"
					className="inline-block px-8 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-purple-500 transform hover:-translate-y-0.5 transition-all duration-200"
				>
					Go to Dashboard
				</Link>
			</div>
		</div>
	);
};

export default Home;
