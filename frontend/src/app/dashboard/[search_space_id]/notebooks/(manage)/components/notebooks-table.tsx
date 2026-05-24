"use client";

import { ChevronDown, ChevronUp, Edit, Eye, ImageIcon, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import NextImage from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { NotebookListItem } from "@/api/notebooks/types";
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
import { Badge } from "@/components/ui/badge";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export type SortKey = "title" | "status" | "created";

interface NotebooksTableProps {
	notebooks: NotebookListItem[];
	searchSpaceId: string;
	isLoading: boolean;
	onDelete: (notebookId: number) => void;
	isDeleting: boolean;
	sortKey: SortKey;
	sortDesc: boolean;
	onSortChange: (key: SortKey) => void;
	canModify?: boolean;
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

function SortableHeader({
	label,
	sortKeyVal,
	currentSortKey,
	sortDesc,
	onSortChange,
}: {
	label: string;
	sortKeyVal: SortKey;
	currentSortKey: SortKey;
	sortDesc: boolean;
	onSortChange: (key: SortKey) => void;
}) {
	return (
		<Button
			variant="ghost"
			className="flex h-full w-full cursor-pointer select-none items-center justify-between gap-2"
			onClick={() => onSortChange(sortKeyVal)}
		>
			{label}
			{currentSortKey === sortKeyVal ? (
				sortDesc ? (
					<ChevronDown className="shrink-0 opacity-60" size={16} />
				) : (
					<ChevronUp className="shrink-0 opacity-60" size={16} />
				)
			) : null}
		</Button>
	);
}

export function NotebooksTable({
	notebooks,
	searchSpaceId,
	isLoading,
	onDelete,
	isDeleting,
	sortKey,
	sortDesc,
	onSortChange,
	canModify = true,
}: NotebooksTableProps) {
	const [notebookToDelete, setNotebookToDelete] =
		useState<NotebookListItem | null>(null);

	if (isLoading) {
		return (
			<div className="rounded-md border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">Image</TableHead>
							<TableHead>Title</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Summary</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{["a", "b", "c", "d", "e"].map((key) => (
							<TableRow key={key}>
								<TableCell>
									<Skeleton className="h-8 w-8 rounded-md" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-40" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-28" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-48" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-24" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-8 w-20 ml-auto" />
								</TableCell>
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
				<h3 className="text-lg font-medium mb-2">No notebooks found</h3>
				<p className="text-muted-foreground mb-6">
					No notebooks match your current search and filter criteria.
				</p>
				{canModify && (
					<Button asChild>
						<Link href={`/dashboard/${searchSpaceId}/notebooks/create`}>
							Create Notebook
						</Link>
					</Button>
				)}
			</div>
		);
	}

	return (
		<>
			<div className="rounded-md border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-12">Image</TableHead>
							<TableHead>
								<SortableHeader
									label="Title"
									sortKeyVal="title"
									currentSortKey={sortKey}
									sortDesc={sortDesc}
									onSortChange={onSortChange}
								/>
							</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Summary</TableHead>
							<TableHead>
								<SortableHeader
									label="Status"
									sortKeyVal="status"
									currentSortKey={sortKey}
									sortDesc={sortDesc}
									onSortChange={onSortChange}
								/>
							</TableHead>
							<TableHead>
								<SortableHeader
									label="Created"
									sortKeyVal="created"
									currentSortKey={sortKey}
									sortDesc={sortDesc}
									onSortChange={onSortChange}
								/>
							</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{notebooks.map((notebook, index) => (
							<motion.tr
								key={notebook.id}
								initial={{ opacity: 0, y: 10 }}
								animate={{
									opacity: 1,
									y: 0,
									transition: {
										type: "spring",
										stiffness: 300,
										damping: 30,
										delay: index * 0.03,
									},
								}}
								className="border-b transition-colors hover:bg-muted/50"
							>
								<TableCell>
									{notebook.headline_image_url ? (
										<div className="h-8 w-8 rounded-md bg-muted/50 overflow-hidden border relative">
											<NextImage
												src={notebook.headline_image_url}
												alt={`Cover for ${notebook.title}`}
												fill
												className="object-cover"
												sizes="32px"
											/>
										</div>
									) : (
										<div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center border">
											<ImageIcon className="h-4 w-4 text-muted-foreground/40" />
										</div>
									)}
								</TableCell>
								<TableCell className="font-medium max-w-[250px]">
									<Tooltip>
										<TooltipTrigger asChild>
											<Link
												href={`/dashboard/${searchSpaceId}/notebooks/${notebook.id}`}
												className="hover:underline line-clamp-2"
											>
												{notebook.title}
											</Link>
										</TooltipTrigger>
										<TooltipContent>
											<p>{notebook.title}</p>
										</TooltipContent>
									</Tooltip>
								</TableCell>
								<TableCell
									className="text-muted-foreground text-sm max-w-[180px] truncate"
									title={notebook.slug}
								>
									{notebook.slug}
								</TableCell>
								<TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
									{notebook.excerpt || "--"}
								</TableCell>
								<TableCell>
									{notebook.is_published ? (
										<Badge className="bg-green-500 hover:bg-green-600 text-white">
											Published
										</Badge>
									) : (
										<span className="text-muted-foreground text-sm" />
									)}
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{formatDate(notebook.created_at)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										{notebook.is_published && (
											<Button variant="outline" size="sm" asChild>
												<a
													href={`/public/notebooks/${notebook.slug}`}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Eye className="h-4 w-4" />
													<span className="sr-only">View public URL</span>
												</a>
											</Button>
										)}
										{canModify && (
											<>
												<Button variant="outline" size="sm" asChild>
													<Link
														href={`/dashboard/${searchSpaceId}/notebooks/${notebook.id}/edit`}
													>
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
											</>
										)}
									</div>
								</TableCell>
							</motion.tr>
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
							Are you sure you want to delete &quot;{notebookToDelete?.title}
							&quot;? This action cannot be undone.
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
