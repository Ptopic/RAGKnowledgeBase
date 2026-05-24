"use client";

import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";

import useCreateNotebook from "@/api/notebooks/hooks/useCreateNotebook";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import { AccessDeniedPage } from "@/components/access-denied-page";
import { NotebookEditor } from "@/components/notebook/NotebookEditor";
import { NotebookPreviewModal } from "@/components/notebook/NotebookPreviewModal";
import { HeadlineImageUploader } from "@/components/notebook/HeadlineImageUploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CreateNotebookPage({
	params,
}: {
	params: Promise<{ search_space_id: string }>;
}) {
	const { search_space_id } = use(params);
	const router = useRouter();
	const searchSpaceIdNum = Number(search_space_id);

	const { data: searchSpaceData } = useGetSearchSpace(searchSpaceIdNum);

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [summary, setSummary] = useState("");
	const [headlineImageUrl, setHeadlineImageUrl] = useState<string | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);

	const createMutation = useCreateNotebook();

	if (searchSpaceData && searchSpaceData.role === "VIEWER" && !searchSpaceData.is_owner) {
		return <AccessDeniedPage />;
	}

	if (Number.isNaN(searchSpaceIdNum)) {
		throw new Error("Invalid search space ID");
	}

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
					...(headlineImageUrl ? { headline_image_url: headlineImageUrl } : {}),
				},
			},
			{
				onSuccess: (notebook) => {
					toast.success("Notebook created successfully");
					router.push(`/dashboard/${search_space_id}/notebooks/${notebook.id}/edit`);
				},
			},
		);
	};

	return (
		<div className="h-screen flex flex-col">
			<div className="sticky top-0 z-50 flex items-center justify-between px-3 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
				<Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/${search_space_id}/notebooks`)} aria-label="Back to notebooks">
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setPreviewOpen(true)}
						disabled={createMutation.isPending}
					>
						<Eye className="h-4 w-4 mr-1" />
						Preview
					</Button>
					<Button type="submit" form="create-notebook-form" disabled={createMutation.isPending}>
						{createMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Create Notebook
					</Button>
				</div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex-1 flex flex-col overflow-y-auto"
			>
				<form id="create-notebook-form" onSubmit={handleSubmit} className="flex-1 flex flex-col">
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
										className="text-lg text-muted-foreground italic bg-transparent border-0 shadow-none focus-visible:ring-0 px-0 min-h-0 resize-none placeholder:text-muted-foreground/40"
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
									<NotebookEditor onChange={setContent} searchSpaceId={searchSpaceIdNum} />
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
				createdAt={new Date().toISOString()}
				authorName={null}
				authorPicture={null}
				headlineImageUrl={headlineImageUrl}
			/>
		</div>
	);
}
