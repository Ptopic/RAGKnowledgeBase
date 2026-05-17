"use client";

import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { NotebookListItem } from "@/api/notebooks/types";

interface NotebooksTableProps {
	notebooks: NotebookListItem[];
	searchSpaceId: string;
	isLoading: boolean;
	onDelete: (notebookId: number) => void;
	isDeleting: boolean;
}

function formatDate(dateStr: string): string {
	try {
		return new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return dateStr;
	}
}

export function NotebooksTable({
	notebooks,
	searchSpaceId,
	isLoading,
	onDelete,
	isDeleting,
}: NotebooksTableProps) {
	const [notebookToDelete, setNotebookToDelete] = useState<NotebookListItem | null>(null);

	if (isLoading) {
		return (
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Summary</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{["a", "b", "c", "d", "e"].map((key) => (
							<TableRow key={key}>
								<TableCell><Skeleton className="h-4 w-40" /></TableCell>
								<TableCell><Skeleton className="h-4 w-28" /></TableCell>
								<TableCell><Skeleton className="h-4 w-48" /></TableCell>
								<TableCell><Skeleton className="h-4 w-24" /></TableCell>
								<TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	if (notebooks.length === 0) {
		return (
			<div className="text-center py-12">
				<h3 className="text-lg font-medium mb-2">No notebooks yet</h3>
				<p className="text-muted-foreground mb-6">
					Get started by creating your first notebook
				</p>
				<Button asChild>
					<Link href={`/dashboard/${searchSpaceId}/notebooks/create`}>
						Create Notebook
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Summary</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{notebooks.map((notebook) => (
							<TableRow key={notebook.id}>
								<TableCell className="font-medium">
									<Link
										href={`/dashboard/${searchSpaceId}/notebooks/${notebook.id}`}
										className="hover:underline"
									>
										{notebook.title}
									</Link>
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{notebook.slug}
								</TableCell>
								<TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
									{notebook.excerpt || "—"}
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{formatDate(notebook.created_at)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										<Button variant="outline" size="sm" asChild>
											<Link href={`/dashboard/${searchSpaceId}/notebooks/${notebook.id}/edit`}>
												<Edit className="h-4 w-4" />
												<span className="sr-only">Edit</span>
											</Link>
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="text-destructive-foreground hover:bg-destructive/10"
											onClick={() => setNotebookToDelete(notebook)}
										>
											<Trash2 className="h-4 w-4" />
											<span className="sr-only">Delete</span>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<AlertDialog
				open={!!notebookToDelete}
				onOpenChange={(open) => !open && setNotebookToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Notebook</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete &quot;{notebookToDelete?.title}&quot;? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setNotebookToDelete(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							onClick={() => {
								if (notebookToDelete) {
									onDelete(notebookToDelete.id);
									setNotebookToDelete(null);
								}
							}}
							disabled={isDeleting}
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
