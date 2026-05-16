"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import useGetNotebooks from "@/api/notebooks/hooks/useGetNotebooks";
import useDeleteNotebook from "@/api/notebooks/hooks/useDeleteNotebook";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { NotebooksTable } from "./components/notebooks-table";

export default function NotebooksManagePage({
	params,
}: {
	params: Promise<{ search_space_id: string }>;
}) {
	const { search_space_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);

	const { data: notebooks = [], isLoading } = useGetNotebooks({
		search_space_id: searchSpaceIdNum,
	});

	const deleteMutation = useDeleteNotebook();

	const handleDelete = (notebookId: number) => {
		deleteMutation.mutate(
			{ searchSpaceId: searchSpaceIdNum, notebookId },
			{
				onSuccess: () => {
					router.push(`/dashboard/${search_space_id}/notebooks`);
				},
			},
		);
	};

	return (
		<div className="container mx-auto py-8 max-w-6xl">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="mb-8 flex items-center justify-between"
			>
				<div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
						<Link
							href={`/dashboard/${search_space_id}/notebooks`}
							className="hover:underline"
						>
							Notebooks
						</Link>
					</div>
					<h1 className="text-3xl font-bold tracking-tight">Manage Notebooks</h1>
					<p className="text-muted-foreground mt-2">
						Create, edit, and manage your notebooks
					</p>
				</div>
				<Button
					onClick={() =>
						router.push(`/dashboard/${search_space_id}/notebooks/create`)
					}
				>
					<Plus className="mr-2 h-4 w-4" />
					Create Notebook
				</Button>
			</motion.div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Your Notebooks</CardTitle>
					<CardDescription>
						View and manage your notebooks
					</CardDescription>
				</CardHeader>
				<CardContent>
					<NotebooksTable
						notebooks={notebooks}
						searchSpaceId={search_space_id}
						isLoading={isLoading}
						onDelete={handleDelete}
						isDeleting={deleteMutation.isPending}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
