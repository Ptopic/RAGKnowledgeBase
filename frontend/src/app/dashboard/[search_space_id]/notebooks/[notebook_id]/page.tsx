"use client";

import { ArrowLeft, Edit, Loader2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import useGetNotebook from "@/api/notebooks/hooks/useGetNotebook";
import useDeleteNotebook from "@/api/notebooks/hooks/useDeleteNotebook";
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
			<div className="container mx-auto py-8 max-w-4xl">
				<Skeleton className="h-6 w-24 mb-6" />
				<Skeleton className="h-10 w-3/4 mb-4" />
				<Skeleton className="h-4 w-1/2 mb-8" />
				<div className="space-y-4">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			</div>
		);
	}

	if (!notebook) {
		return (
			<div className="container mx-auto py-8 max-w-4xl text-center">
				<h2 className="text-xl font-medium mb-2">Notebook not found</h2>
				<p className="text-muted-foreground mb-6">
					The notebook you are looking for does not exist.
				</p>
				<Button asChild>
					<Link href={`/dashboard/${search_space_id}/notebooks`}>
						Back to Notebooks
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 max-w-4xl">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
					<Link
						href={`/dashboard/${search_space_id}/notebooks`}
						className="hover:underline flex items-center gap-1"
					>
						<ArrowLeft className="h-3 w-3" />
						Notebooks
					</Link>
				</div>

				<div className="flex items-start justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold tracking-tight mb-2">
							{notebook.title}
						</h1>
						<div className="flex items-center gap-3 text-sm text-muted-foreground">
							<span>{notebook.slug}</span>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link
								href={`/dashboard/${search_space_id}/notebooks/${notebook_id}/edit`}
							>
								<Edit className="h-4 w-4 mr-1" />
								Edit
							</Link>
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

				{notebook.excerpt && (
					<Card className="mb-6">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Summary</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">{notebook.excerpt}</p>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Content</CardTitle>
						<CardDescription>
							Created {formatDate(notebook.created_at)}
							{notebook.updated_at !== notebook.created_at &&
								` · Updated ${formatDate(notebook.updated_at)}`}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
							{notebook.content}
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
