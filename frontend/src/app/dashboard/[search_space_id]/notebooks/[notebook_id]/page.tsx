"use client";

import { ArrowLeft, Edit, Loader2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { use } from "react";

import useDeleteNotebook from "@/api/notebooks/hooks/useDeleteNotebook";
import useGetNotebook from "@/api/notebooks/hooks/useGetNotebook";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function formatDate(dateStr: string): string {
	try {
		return new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return dateStr;
	}
}

export default function NotebookDetailPage({
	params,
}: {
	params: Promise<{ search_space_id: string; notebook_id: string }>;
}) {
	const { search_space_id, notebook_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);
	const notebookIdNum = Number(notebook_id);

	const { data: notebook, isLoading } = useGetNotebook(searchSpaceIdNum, notebookIdNum);
	const deleteMutation = useDeleteNotebook();

	const handleDelete = () => {
		deleteMutation.mutate(
			{ searchSpaceId: searchSpaceIdNum, notebookId: notebookIdNum },
			{
				onSuccess: () => {
					router.push(`/dashboard/${search_space_id}/notebooks`);
				},
			},
		);
	};

	if (isLoading) {
		return (
			<div className="h-screen flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!notebook) {
		return (
			<div className="h-screen flex flex-col items-center justify-center gap-4">
				<h2 className="text-xl font-medium">Notebook not found</h2>
				<p className="text-muted-foreground">
					The notebook you are looking for does not exist.
				</p>
				<Button onClick={() => router.push(`/dashboard/${search_space_id}/notebooks`)}>
					Back to Notebooks
				</Button>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col">
			<div className="sticky top-0 z-50 flex items-center justify-between px-8 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" asChild>
						<a href={`/dashboard/${search_space_id}/notebooks/${notebook_id}/edit`}>
							<Edit className="h-4 w-4 mr-1" />
							Edit
						</a>
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="text-destructive-foreground hover:bg-destructive/10"
							>
								<Trash2 className="h-4 w-4 mr-1" />
								Delete
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Notebook</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete &quot;{notebook.title}&quot;?
									This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive text-white hover:bg-destructive/90"
									onClick={handleDelete}
									disabled={deleteMutation.isPending}
								>
									{deleteMutation.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex-1 flex flex-col overflow-y-auto"
			>
				<div className="max-w-3xl mx-auto w-full px-6 py-12">
					<h1 className="text-4xl font-bold tracking-tight mb-2">
						{notebook.title}
					</h1>

					{notebook.excerpt && (
						<p className="text-lg text-muted-foreground italic mb-8">
							{notebook.excerpt}
						</p>
					)}

					<div className="text-xs text-muted-foreground mb-8">
						Created {formatDate(notebook.created_at)}
						{notebook.updated_at !== notebook.created_at &&
							` · Updated ${formatDate(notebook.updated_at)}`}
					</div>

					<div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
						{notebook.content}
					</div>
				</div>
			</motion.div>
		</div>
	);
}
