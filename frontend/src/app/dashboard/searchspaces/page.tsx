"use client";

import { motion } from "motion/react";
import useCreateSearchSpace from "@/api/searchspaces/hooks/useCreateSearchSpace";
import { SearchSpaceForm } from "@/components/search-space-form";

export default function SearchSpacesPage() {
	const { mutate: createSearchSpace } = useCreateSearchSpace();

	const handleCreateSearchSpace = (data: {
		name: string;
		description: string;
		headline_image_url?: string | null;
	}) => {
		createSearchSpace({
			name: data.name,
			description: data.description,
			...(data.headline_image_url ? { headline_image_url: data.headline_image_url } : {}),
		});
	};

	return (
		<motion.div
			className="container mx-auto py-10"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			<div className="mx-auto max-w-5xl">
				<SearchSpaceForm onSubmit={handleCreateSearchSpace} />
			</div>
		</motion.div>
	);
}
