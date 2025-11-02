"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import useCreateSearchSpace from "@/api/searchspaces/hooks/useCreateSearchSpace";
import { SearchSpaceForm } from "@/components/search-space-form";

export default function SearchSpacesPage() {
	const router = useRouter();

	const { mutate: createSearchSpace } = useCreateSearchSpace({
		onSuccess: () => {
			router.push(`/dashboard`);
		},
	});

	const handleCreateSearchSpace = (data: {
		name: string;
		description: string;
	}) => {
		createSearchSpace(data);
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
