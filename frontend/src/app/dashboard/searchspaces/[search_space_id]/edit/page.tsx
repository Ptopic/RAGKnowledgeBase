"use client";

import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { use } from "react";
import useDeleteSearchSpace from "@/api/searchspaces/hooks/useDeleteSearchSpace";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import useUpdateSearchSpace from "@/api/searchspaces/hooks/useUpdateSearchSpace";
import { AccessDeniedPage } from "@/components/access-denied-page";
import { SearchSpaceForm } from "@/components/search-space-form";

export default function EditSearchSpacePage({
	params,
}: {
	params: Promise<{ search_space_id: string }>;
}) {
	const { search_space_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);

	const { data: searchSpace, isLoading } = useGetSearchSpace(searchSpaceIdNum);
	const { mutate: updateSearchSpace } = useUpdateSearchSpace();
	const { mutate: deleteSearchSpace } = useDeleteSearchSpace({
		onSuccess: () => {
			router.push("/dashboard");
		},
	});

	if (Number.isNaN(searchSpaceIdNum)) {
		throw new Error("Invalid search space ID");
	}

	if (isLoading) {
		return (
			<div className="h-screen flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Only owners and editors can edit
	if (searchSpace && searchSpace.role === "VIEWER" && !searchSpace.is_owner) {
		return <AccessDeniedPage />;
	}

	const handleUpdate = (data: { name: string; description: string }) => {
		updateSearchSpace({ id: searchSpaceIdNum, data });
	};

	const handleDelete = () => {
		deleteSearchSpace(searchSpaceIdNum);
	};

	return (
		<motion.div
			className="container mx-auto py-10"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			<div className="mx-auto max-w-5xl">
				<SearchSpaceForm
					isEditing
					initialData={{
						name: searchSpace?.name || "",
						description: searchSpace?.description || "",
					}}
					onSubmit={handleUpdate}
					onDelete={handleDelete}
				/>
			</div>
		</motion.div>
	);
}
