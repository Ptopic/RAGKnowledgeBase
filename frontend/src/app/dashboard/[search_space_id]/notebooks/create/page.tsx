"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import useCreateNotebook from "@/api/notebooks/hooks/useCreateNotebook";
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

export default function CreateNotebookPage({
	params,
}: {
	params: Promise<{ search_space_id: string }>;
}) {
	const { search_space_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [summary, setSummary] = useState("");

	const createMutation = useCreateNotebook();

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

		createMutation.mutate(
			{
				searchSpaceId: searchSpaceIdNum,
				data: {
					title: title.trim(),
					content,
					...(summary.trim() ? { excerpt: summary.trim() } : {}),
				},
			},
			{
				onSuccess: () => {
					toast.success("Notebook created successfully");
					router.push(`/dashboard/${search_space_id}/notebooks`);
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
						href={`/dashboard/${search_space_id}/notebooks`}
						className="hover:underline flex items-center gap-1"
					>
						<ArrowLeft className="h-3 w-3" />
						Notebooks
					</Link>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Create Notebook</CardTitle>
						<CardDescription>
							Write a new notebook for your knowledge base
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
								<NotebookEditor onChange={setContent} />
							</div>

							<div className="flex justify-end gap-3 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										router.push(`/dashboard/${search_space_id}/notebooks`)
									}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={createMutation.isPending}>
									{createMutation.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Create Notebook
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
