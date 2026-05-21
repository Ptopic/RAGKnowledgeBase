"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Globe, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import useGetNotebook from "@/api/notebooks/hooks/useGetNotebook";
import usePublishNotebook from "@/api/notebooks/hooks/usePublishNotebook";
import useUpdateNotebook from "@/api/notebooks/hooks/useUpdateNotebook";
import { NotebookEditor } from "@/components/notebook/NotebookEditor";
import { NotebookPreviewModal } from "@/components/notebook/NotebookPreviewModal";
import { HeadlineImageUploader } from "@/components/notebook/HeadlineImageUploader";
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

	if (Number.isNaN(searchSpaceIdNum) || Number.isNaN(notebookIdNum)) {
		throw new Error("Invalid ID parameter");
	}

	const { data: notebook, isLoading } = useGetNotebook(
		searchSpaceIdNum,
		notebookIdNum,
	);
	const updateMutation = useUpdateNotebook();
	const publishMutation = usePublishNotebook();

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [summary, setSummary] = useState("");
	const [headlineImageUrl, setHeadlineImageUrl] = useState<string | null>(null);
	const initialized = useRef(false);

	const [previewOpen, setPreviewOpen] = useState(false);
	const [publishDialogOpen, setPublishDialogOpen] = useState(false);

	useEffect(() => {
		if (notebook && !initialized.current) {
			initialized.current = true;
			setTitle(notebook.title);
			setContent(notebook.content);
			setSummary(notebook.excerpt || "");
			setHeadlineImageUrl(notebook.headline_image_url || null);
		}
	}, [notebook]);

	const validateFields = () => {
		if (!title.trim()) {
			toast.error("Title is required");
			return false;
		}

		if (!content.trim()) {
			toast.error("Content is required");
			return false;
		}

		if (summary.length > 500) {
			toast.error("Summary must be 500 characters or less");
			return false;
		}

		return true;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateFields()) return;

		updateMutation.mutate(
			{
				searchSpaceId: searchSpaceIdNum,
				notebookId: notebookIdNum,
				data: {
					title: title.trim(),
					content,
					excerpt: summary.trim() || undefined,
					headline_image_url: headlineImageUrl ?? null,
				},
			},
			{
				onSuccess: async (_data, variables) => {
					await queryClient.invalidateQueries({
						queryKey: [NOTEBOOK, variables.searchSpaceId, variables.notebookId],
					});
					toast.success("Notebook updated successfully");
					router.push(`/dashboard/${search_space_id}/notebooks/${notebook_id}`);
				},
			},
		);
	};

	const saveDraft = async (): Promise<boolean> => {
		if (!validateFields()) return false;

		try {
			await updateMutation.mutateAsync({
				searchSpaceId: searchSpaceIdNum,
				notebookId: notebookIdNum,
				data: {
					title: title.trim(),
					content,
					excerpt: summary.trim() || undefined,
					headline_image_url: headlineImageUrl ?? null,
				},
			});
			await queryClient.invalidateQueries({
				queryKey: [NOTEBOOK, searchSpaceIdNum, notebookIdNum],
			});
			return true;
		} catch {
			toast.error("Failed to save notebook before publishing");
			return false;
		}
	};

	const handlePublish = async () => {
		setPublishDialogOpen(false);

		const saved = await saveDraft();
		if (!saved) return;

		try {
			await publishMutation.mutateAsync(
				{
					searchSpaceId: searchSpaceIdNum,
					notebookId: notebookIdNum,
				},
				{
					onSuccess: () => {
						router.push(`/dashboard/${search_space_id}/notebooks/${notebook_id}`);
					},
				},
			);
		} catch {
			// Error already handled by hook's onError
		}
	};

	const isSaving = updateMutation.isPending;
	const isPublishing = publishMutation.isPending;
	const isBusy = isSaving || isPublishing;

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
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/${search_space_id}/notebooks`)} aria-label="Back to notebooks">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					{notebook?.is_published && (
						<Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
							<Globe className="h-3 w-3" />
							Published
						</Badge>
					)}
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setPreviewOpen(true)}
						disabled={isBusy}
					>
						<Eye className="h-4 w-4 mr-1" />
						Preview
					</Button>
					{!notebook?.is_published && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setPublishDialogOpen(true)}
							disabled={isBusy}
						>
							{isPublishing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
							<Globe className="h-4 w-4 mr-1" />
							Publish
						</Button>
					)}
					<Button type="submit" form="edit-notebook-form" disabled={isBusy}>
						{isSaving && !isPublishing && (
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
				<form id="edit-notebook-form" onSubmit={handleSubmit} className="flex-1 flex flex-col">
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

								<HeadlineImageUploader
									searchSpaceId={searchSpaceIdNum}
									value={headlineImageUrl}
									onChange={setHeadlineImageUrl}
								/>

								<div className="flex-1 min-h-[334px] -ml-[54px]">
									<NotebookEditor initialContent={content} onChange={setContent} searchSpaceId={searchSpaceIdNum} />
								</div>
							</div>
					</div>
				</form>
			</motion.div>

			<NotebookPreviewModal
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				title={title}
				excerpt={summary}
				content={content}
				createdAt={notebook?.published_at || notebook?.created_at || new Date().toISOString()}
				authorName={notebook?.author_name}
				authorPicture={notebook?.author_picture}
				publishedAt={notebook?.published_at}
				headlineImageUrl={headlineImageUrl}
			/>

			<AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Publish Notebook</AlertDialogTitle>
						<AlertDialogDescription>
							Your changes will be saved and this notebook will be made publicly available. Are you sure you want to publish?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
							{isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Publish
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
