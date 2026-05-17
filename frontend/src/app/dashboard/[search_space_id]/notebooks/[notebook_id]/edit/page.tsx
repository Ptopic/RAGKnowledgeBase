"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

import useGetNotebook from "@/api/notebooks/hooks/useGetNotebook";
import useUpdateNotebook from "@/api/notebooks/hooks/useUpdateNotebook";
import { NotebookEditor } from "@/components/notebook/NotebookEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NOTEBOOK } from "@/shared/queryKeys";

export default function EditNotebookPage({
	params,
}: {
	params: Promise<{ search_space_id: string; notebook_id: string }>;
}) {
	const { search_space_id, notebook_id } = use(params);
	const router = useRouter();
	const queryClient = useQueryClient();
	const searchSpaceIdNum = Number(search_space_id);
	const notebookIdNum = Number(notebook_id);

	const { data: notebook, isLoading } = useGetNotebook(
		searchSpaceIdNum,
		notebookIdNum,
	);
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

	const handleSubmit = () => {
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
				onSuccess: async () => {
					await queryClient.invalidateQueries({
						queryKey: [NOTEBOOK, searchSpaceIdNum, notebookIdNum],
					});
					toast.success("Notebook updated successfully");
					router.push(`/dashboard/${search_space_id}/notebooks/${notebook_id}`);
				},
			},
		);
	};

	if (isLoading) {
		return (
			<div className="h-screen flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col">
			<div className="sticky top-0 z-50 flex items-center justify-between px-3 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
				<Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/${search_space_id}/notebooks`)}>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex gap-3">
					<Button variant="outline">Preview</Button>
					<Button onClick={handleSubmit} disabled={updateMutation.isPending}>
						{updateMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Save Changes
					</Button>
				</div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex-1 flex flex-col overflow-y-auto"
			>
				<div className="max-w-3xl mx-auto w-full px-6 py-12 pb-[50dvh]">
					<div className="space-y-4">
						<input
							type="text"
							placeholder="Title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							className="w-full text-4xl font-bold tracking-tight bg-transparent border-0 outline-none placeholder:text-muted-foreground/50 focus:ring-0 focus:outline-none px-0 py-0"
						/>

						<div>
							<Textarea
								placeholder="Add a summary..."
								value={summary}
								onChange={(e) => {
									if (e.target.value.length <= 500) {
										setSummary(e.target.value);
									}
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") e.preventDefault();
								}}
								rows={1}
								className="text-lg text-muted-foreground italic bg-transparent border-0 shadow-none focus-visible:ring-0 px-0 min-h-0 placeholder:text-muted-foreground/40"
							/>

							<div className="text-xs text-muted-foreground text-right">
								{summary.length}/500
							</div>
						</div>

						<div className="flex-1 min-h-[334px] -ml-[54px]">
							<NotebookEditor initialContent={content} onChange={setContent} />
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
