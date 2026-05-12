"use client";

import { ArrowLeft, Edit, Loader2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import useGetBlog from "@/api/blogs/hooks/useGetBlog";
import useDeleteBlog from "@/api/blogs/hooks/useDeleteBlog";
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

export default function BlogDetailPage({
	params,
}: {
	params: Promise<{ search_space_id: string; blog_id: string }>;
}) {
	const { search_space_id, blog_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);
	const blogIdNum = Number(blog_id);

	const { data: blog, isLoading } = useGetBlog(searchSpaceIdNum, blogIdNum);
	const deleteMutation = useDeleteBlog();

	const handleDelete = () => {
		deleteMutation.mutate(
			{ searchSpaceId: searchSpaceIdNum, blogId: blogIdNum },
			{
				onSuccess: () => {
					router.push(`/dashboard/${search_space_id}/blogs`);
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

	if (!blog) {
		return (
			<div className="container mx-auto py-8 max-w-4xl text-center">
				<h2 className="text-xl font-medium mb-2">Blog not found</h2>
				<p className="text-muted-foreground mb-6">
					The blog post you are looking for does not exist.
				</p>
				<Button asChild>
					<Link href={`/dashboard/${search_space_id}/blogs`}>
						Back to Blogs
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
						href={`/dashboard/${search_space_id}/blogs`}
						className="hover:underline flex items-center gap-1"
					>
						<ArrowLeft className="h-3 w-3" />
						Blogs
					</Link>
				</div>

				<div className="flex items-start justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold tracking-tight mb-2">
							{blog.title}
						</h1>
						<div className="flex items-center gap-3 text-sm text-muted-foreground">
							<Badge variant="secondary">{blog.content_type}</Badge>
							<span>{blog.slug}</span>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link
								href={`/dashboard/${search_space_id}/blogs/${blog_id}/edit`}
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
									<AlertDialogTitle>Delete Blog</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete &quot;{blog.title}&quot;?
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

				{blog.excerpt && (
					<Card className="mb-6">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Excerpt</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">{blog.excerpt}</p>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Content</CardTitle>
						<CardDescription>
							Created {formatDate(blog.created_at)}
							{blog.updated_at !== blog.created_at &&
								` · Updated ${formatDate(blog.updated_at)}`}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{blog.content_type === "html" ? (
							<div
								className="prose prose-sm dark:prose-invert max-w-none"
								dangerouslySetInnerHTML={{ __html: blog.content }}
							/>
						) : (
							<pre className="bg-muted rounded-md p-4 overflow-x-auto text-sm">
								<code>{blog.content}</code>
							</pre>
						)}
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
