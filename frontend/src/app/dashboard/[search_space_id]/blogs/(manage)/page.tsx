"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import useGetBlogs from "@/api/blogs/hooks/useGetBlogs";
import useDeleteBlog from "@/api/blogs/hooks/useDeleteBlog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BlogsTable } from "./components/blogs-table";

export default function BlogsManagePage({
	params,
}: {
	params: Promise<{ search_space_id: string }>;
}) {
	const { search_space_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);

	const { data: blogs = [], isLoading } = useGetBlogs({
		search_space_id: searchSpaceIdNum,
	});

	const deleteMutation = useDeleteBlog();

	const handleDelete = (blogId: number) => {
		deleteMutation.mutate(
			{ searchSpaceId: searchSpaceIdNum, blogId },
			{
				onSuccess: () => {
					router.push(`/dashboard/${search_space_id}/blogs`);
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
							href={`/dashboard/${search_space_id}/blogs`}
							className="hover:underline"
						>
							Blogs
						</Link>
					</div>
					<h1 className="text-3xl font-bold tracking-tight">Manage Blogs</h1>
					<p className="text-muted-foreground mt-2">
						Create, edit, and manage your blog posts
					</p>
				</div>
				<Button
					onClick={() =>
						router.push(`/dashboard/${search_space_id}/blogs/create`)
					}
				>
					<Plus className="mr-2 h-4 w-4" />
					Create Blog
				</Button>
			</motion.div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Your Blogs</CardTitle>
					<CardDescription>
						View and manage your blog posts
					</CardDescription>
				</CardHeader>
				<CardContent>
					<BlogsTable
						blogs={blogs}
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
