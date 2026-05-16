"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import useGetNotebook from "@/api/notebooks/hooks/useGetNotebook";
import useUpdateNotebook from "@/api/notebooks/hooks/useUpdateNotebook";
import { NotebookEditor } from "@/components/notebook/NotebookEditor";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditNotebookPage({
	params,
}: {
	params: Promise<{ search_space_id: string; notebook_id: string }>;
}) {
	const { search_space_id, notebook_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);
	const notebookIdNum = Number(notebook_id);

	const { data: notebook, isLoading } = useGetNotebook(searchSpaceIdNum, notebookIdNum);
	const updateMutation = useUpdateNotebook();

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [summary, setSummary] = useState("");

	useEffect(() => {
		if (notebook) {
			setTitle(notebook.title);
			setContent(notebook.content);
			setSummary(notebook.excerpt || "");
		}
	}, [notebook]);

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

		if (summary.length > 500) {
			toast.error("Summary must be 500 characters or less");
			return;
		}

		updateMutation.mutate(
			{
				searchSpaceId: searchSpaceIdNum,
				notebookId: notebookIdNum,
				data: {
					title: title.trim(),
					content,
					excerpt: summary.trim() || undefined,
				},
			},
			{
				onSuccess: () => {
					toast.success("Notebook updated successfully");
					router.push(`/dashboard/${search_space_id}/notebooks/${notebook_id}`);
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
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-64 w-full" />
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
						href={`/dashboard/${search_space_id}/notebooks`}
						className="hover:underline flex items-center gap-1"
					>
						<ArrowLeft className="h-3 w-3" />
						Notebooks
					</Link>
					<span>/</span>
					<Link
						href={`/dashboard/${search_space_id}/notebooks/${notebook_id}`}
						className="hover:underline"
					>
						{notebook?.title || "Notebook"}
					</Link>
					<span>/</span>
					<span>Edit</span>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Edit Notebook</CardTitle>
						<CardDescription>
							Update your notebook content and settings
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="title">Title</Label>
								<Input
									id="title"
									placeholder="Enter notebook title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="summary">
									Summary{" "}
									<span className="text-muted-foreground font-normal">
										(optional, max 500 chars)
									</span>
								</Label>
								<Textarea
									id="summary"
									placeholder="Brief summary of the notebook"
									value={summary}
									onChange={(e) => {
										if (e.target.value.length <= 500) {
											setSummary(e.target.value);
										}
									}}
									rows={3}
								/>
								<p className="text-xs text-muted-foreground text-right">
									{summary.length}/500
								</p>
							</div>

							<div className="space-y-2">
								<Label>Content</Label>
								<NotebookEditor
									initialContent={content}
									onChange={setContent}
								/>
							</div>

							<div className="flex justify-end gap-3 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										router.push(
											`/dashboard/${search_space_id}/notebooks/${notebook_id}`,
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
