"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import useGetBlog from "@/api/blogs/hooks/useGetBlog";
import useUpdateBlog from "@/api/blogs/hooks/useUpdateBlog";
import type { ContentType } from "@/api/blogs/types";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditBlogPage({
	params,
}: {
	params: Promise<{ search_space_id: string; blog_id: string }>;
}) {
	const { search_space_id, blog_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);
	const blogIdNum = Number(blog_id);

	const { data: blog, isLoading } = useGetBlog(searchSpaceIdNum, blogIdNum);
	const updateMutation = useUpdateBlog();

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [contentType, setContentType] = useState<ContentType>("html");
	const [excerpt, setExcerpt] = useState("");

	useEffect(() => {
		if (blog) {
			setTitle(blog.title);
			setContent(blog.content);
			setContentType(blog.content_type);
			setExcerpt(blog.excerpt || "");
		}
	}, [blog]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!title.trim()) {
			toast.error("Title is required");
			return;
		}

		if (!content.trim()) {
			toast.error("Content is required");
			return;
		}

		if (excerpt.length > 500) {
			toast.error("Excerpt must be 500 characters or less");
			return;
		}

		updateMutation.mutate(
			{
				searchSpaceId: searchSpaceIdNum,
				blogId: blogIdNum,
				data: {
					title: title.trim(),
					content,
					content_type: contentType,
					excerpt: excerpt.trim() || undefined,
				},
			},
			{
				onSuccess: () => {
					toast.success("Blog updated successfully");
					router.push(`/dashboard/${search_space_id}/blogs/${blog_id}`);
				},
			},
		);
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 max-w-4xl">
				<Skeleton className="h-6 w-32 mb-6" />
				<Skeleton className="h-10 w-1/2 mb-8" />
				<div className="space-y-6">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-48" />
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
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
					<span>/</span>
					<Link
						href={`/dashboard/${search_space_id}/blogs/${blog_id}`}
						className="hover:underline"
					>
						{blog?.title || "Blog"}
					</Link>
					<span>/</span>
					<span>Edit</span>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Edit Blog Post</CardTitle>
						<CardDescription>
							Update your blog post content and settings
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="title">Title</Label>
								<Input
									id="title"
									placeholder="Enter blog title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="content-type">Content Type</Label>
								<Select
									value={contentType}
									onValueChange={(val) => setContentType(val as ContentType)}
								>
									<SelectTrigger id="content-type" className="w-[180px]">
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="html">HTML</SelectItem>
										<SelectItem value="json">JSON</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Content</Label>
								<RichTextEditor
									content={content}
									onChange={setContent}
									placeholder="Write your blog content..."
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="excerpt">
									Excerpt{" "}
									<span className="text-muted-foreground font-normal">
										(optional, max 500 chars)
									</span>
								</Label>
								<Textarea
									id="excerpt"
									placeholder="Brief summary of the blog post"
									value={excerpt}
									onChange={(e) => {
										if (e.target.value.length <= 500) {
											setExcerpt(e.target.value);
										}
									}}
									rows={3}
								/>
								<p className="text-xs text-muted-foreground text-right">
									{excerpt.length}/500
								</p>
							</div>

							<div className="flex justify-end gap-3 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										router.push(
											`/dashboard/${search_space_id}/blogs/${blog_id}`,
										)
									}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={updateMutation.isPending}>
									{updateMutation.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Save Changes
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
