"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import useCreateBlog from "@/api/blogs/hooks/useCreateBlog";
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

export default function CreateBlogPage({
	params,
}: {
	params: Promise<{ search_space_id: string }>;
}) {
	const { search_space_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [contentType, setContentType] = useState<ContentType>("html");
	const [excerpt, setExcerpt] = useState("");

	const createMutation = useCreateBlog();

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

		createMutation.mutate(
			{
				searchSpaceId: searchSpaceIdNum,
				data: {
					title: title.trim(),
					content,
					content_type: contentType,
					...(excerpt.trim() ? { excerpt: excerpt.trim() } : {}),
				},
			},
			{
				onSuccess: () => {
					toast.success("Blog created successfully");
					router.push(`/dashboard/${search_space_id}/blogs`);
				},
			},
		);
	};

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

				<Card>
					<CardHeader>
						<CardTitle>Create Blog Post</CardTitle>
						<CardDescription>
							Write a new blog post for your knowledge base
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
										router.push(`/dashboard/${search_space_id}/blogs`)
									}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={createMutation.isPending}>
									{createMutation.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Create Blog
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
