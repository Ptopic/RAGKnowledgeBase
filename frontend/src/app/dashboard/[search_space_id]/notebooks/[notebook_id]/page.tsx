"use client";

import { ArrowLeft, Edit, Eye, Globe, Loader2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { use } from "react";

import useDeleteNotebook from "@/api/notebooks/hooks/useDeleteNotebook";
import useGetNotebook from "@/api/notebooks/hooks/useGetNotebook";
import usePublishNotebook from "@/api/notebooks/hooks/usePublishNotebook";
import useUnpublishNotebook from "@/api/notebooks/hooks/useUnpublishNotebook";
import { useGetSearchSpace } from "@/api/searchspaces/hooks/useGetSearchSpace";
import { estimateReadTime } from "@/components/notebook/estimateReadTime";
import { NotebookMetadataHeader } from "@/components/notebook/NotebookMetadataHeader";
import { NotebookViewer } from "@/components/notebook/NotebookViewer";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function NotebookDetailPage({
	params,
}: {
	params: Promise<{ search_space_id: string; notebook_id: string }>;
}) {
	const { search_space_id, notebook_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);
	const notebookIdNum = Number(notebook_id);
	const { data: searchSpace } = useGetSearchSpace(searchSpaceIdNum);
	const canModify = searchSpace ? searchSpace.is_owner || searchSpace.role === "EDITOR" : false;

	if (isNaN(searchSpaceIdNum) || isNaN(notebookIdNum)) {
		throw new Error("Invalid ID parameter");
	}

	const { data: notebook, isLoading } = useGetNotebook(
		searchSpaceIdNum,
		notebookIdNum,
	);
	const deleteMutation = useDeleteNotebook();
	const publishMutation = usePublishNotebook();
	const unpublishMutation = useUnpublishNotebook();

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

	const handlePublish = () => {
		publishMutation.mutate({
			searchSpaceId: searchSpaceIdNum,
			notebookId: notebookIdNum,
		});
	};

	const handleUnpublish = () => {
		unpublishMutation.mutate({
			searchSpaceId: searchSpaceIdNum,
			notebookId: notebookIdNum,
		});
	};

	const isTogglingPublish =
		publishMutation.isPending || unpublishMutation.isPending;

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
				<Button
					onClick={() => router.push(`/dashboard/${search_space_id}/notebooks`)}
				>
					Back to Notebooks
				</Button>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col">
			<div className="sticky top-0 z-50 flex items-center justify-between px-3 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() =>
							router.push(`/dashboard/${search_space_id}/notebooks`)
						}
						aria-label="Back to notebooks"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					{notebook.is_published && (
						<Badge
							variant="secondary"
							className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
						>
							<Globe className="h-3 w-3" />
							Published
						</Badge>
					)}
				</div>
				<div className="flex gap-2">
					{notebook.is_published && (
						<Button variant="outline" size="sm" asChild>
							<a
								href={`/public/notebooks/${notebook.slug}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Eye className="h-4 w-4 mr-1" />
								View Public
							</a>
						</Button>
					)}
					{canModify && (
						<>
							<Button variant="outline" size="sm" asChild>
								<a
									href={`/dashboard/${search_space_id}/notebooks/${notebook_id}/edit`}
								>
									<Edit className="h-4 w-4 mr-1" />
									Edit
								</a>
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" disabled={isTogglingPublish}>
										{isTogglingPublish && (
											<Loader2 className="h-4 w-4 mr-1 animate-spin" />
										)}
										{notebook.is_published ? "Unpublish" : "Publish"}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{notebook.is_published ? (
										<DropdownMenuItem
											onClick={handleUnpublish}
											disabled={unpublishMutation.isPending}
										>
											<Globe className="h-4 w-4 mr-2" />
											Unpublish Notebook
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem
											onClick={handlePublish}
											disabled={publishMutation.isPending}
										>
											<Globe className="h-4 w-4 mr-2" />
											Publish Notebook
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
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
						</>
					)}
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
						<p className="text-lg text-muted-foreground italic mb-6">
							{notebook.excerpt}
						</p>
					)}

					<NotebookMetadataHeader
						authorName={notebook.author_name ?? null}
						authorPicture={notebook.author_picture ?? null}
						publishedAt={notebook.published_at ?? null}
						createdAt={notebook.created_at}
						readTime={estimateReadTime(notebook.content)}
					/>

					<div className="border-t mb-2" />

					<NotebookViewer content={notebook.content} />
				</div>
			</motion.div>
		</div>
	);
}
