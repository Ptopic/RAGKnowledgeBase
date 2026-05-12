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
import type { BlogListItem } from "@/api/blogs/types";

interface BlogsTableProps {
	blogs: BlogListItem[];
	searchSpaceId: string;
	isLoading: boolean;
	onDelete: (blogId: number) => void;
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

export function BlogsTable({
	blogs,
	searchSpaceId,
	isLoading,
	onDelete,
	isDeleting,
}: BlogsTableProps) {
	const [blogToDelete, setBlogToDelete] = useState<BlogListItem | null>(null);

	if (isLoading) {
		return (
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Content Type</TableHead>
							<TableHead>Excerpt</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{["a", "b", "c", "d", "e"].map((key) => (
							<TableRow key={key}>
								<TableCell><Skeleton className="h-4 w-40" /></TableCell>
								<TableCell><Skeleton className="h-4 w-28" /></TableCell>
								<TableCell><Skeleton className="h-5 w-14" /></TableCell>
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

	if (blogs.length === 0) {
		return (
			<div className="text-center py-12">
				<h3 className="text-lg font-medium mb-2">No blogs yet</h3>
				<p className="text-muted-foreground mb-6">
					Get started by creating your first blog post
				</p>
				<Button asChild>
					<Link href={`/dashboard/${searchSpaceId}/blogs/create`}>
						Create Blog
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
							<TableHead>Content Type</TableHead>
							<TableHead>Excerpt</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{blogs.map((blog) => (
							<TableRow key={blog.id}>
								<TableCell className="font-medium">
									<Link
										href={`/dashboard/${searchSpaceId}/blogs/${blog.id}`}
										className="hover:underline"
									>
										{blog.title}
									</Link>
								</TableCell>
								<TableCell className="text-muted-foreground text-sm">
									{blog.slug}
								</TableCell>
								<TableCell>
									<Badge variant="secondary">{blog.content_type}</Badge>
								</TableCell>
								<TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
									{blog.excerpt || "—"}
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{formatDate(blog.created_at)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										<Button variant="outline" size="sm" asChild>
											<Link href={`/dashboard/${searchSpaceId}/blogs/${blog.id}/edit`}>
												<Edit className="h-4 w-4" />
												<span className="sr-only">Edit</span>
											</Link>
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="text-destructive-foreground hover:bg-destructive/10"
											onClick={() => setBlogToDelete(blog)}
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
				open={!!blogToDelete}
				onOpenChange={(open) => !open && setBlogToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Blog</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete &quot;{blogToDelete?.title}&quot;? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setBlogToDelete(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							onClick={() => {
								if (blogToDelete) {
									onDelete(blogToDelete.id);
									setBlogToDelete(null);
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
