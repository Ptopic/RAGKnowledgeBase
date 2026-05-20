"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, Globe, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { estimateReadTime } from "@/components/notebook/estimateReadTime";
import { NotebookMetadataHeader } from "@/components/notebook/NotebookMetadataHeader";
import { NotebookViewer } from "@/components/notebook/NotebookViewer";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
} from "@/components/ui/dialog";

interface NotebookPreviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	excerpt: string;
	content: string;
	createdAt: string;
	authorName?: string | null;
	authorPicture?: string | null;
	publishedAt?: string | null;
}

export function NotebookPreviewModal({
	open,
	onOpenChange,
	title,
	excerpt,
	content,
	createdAt,
	authorName,
	authorPicture,
	publishedAt,
}: NotebookPreviewModalProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const readTime = estimateReadTime(content);

	const resetScroll = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = 0;
		}
	}, []);

	useEffect(() => {
		if (open) {
			resetScroll();
		}
	}, [open, resetScroll]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPortal>
				<DialogOverlay className="bg-black/40" />
				<DialogPrimitive.Content
					className="fixed z-50 flex flex-col w-[calc(100vw-2rem)] h-[calc(100dvh-2rem)] top-4 left-4 translate-x-0 translate-y-0 gap-0 rounded-lg border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-0 data-[state=open]:slide-in-from-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=closed]:slide-out-to-left-0"
					aria-describedby="preview-description"
				>
					<DialogTitle className="sr-only">
						Preview: {title || "Untitled"}
					</DialogTitle>
					<div className="shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background">
						<div className="flex items-center gap-2">
							<Globe className="h-5 w-5 text-muted-foreground" />
							<h1 className="text-lg font-semibold truncate max-w-[50vw]">
								{title || "Untitled"}
							</h1>
						</div>
						<DialogClose asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<X className="h-4 w-4" />
								<span className="sr-only">Close preview</span>
							</Button>
						</DialogClose>
					</div>

					<div ref={scrollRef} className="flex-1 flex flex-col overflow-y-auto">
						<div className="max-w-3xl mx-auto w-full px-6 py-12">
							<button
								type="button"
								disabled
								className="inline-flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none mb-6 bg-transparent border-0 p-0 hover:no-underline disabled:opacity-100 disabled:cursor-pointer"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to all articles
							</button>

							<h1 className="text-4xl font-bold tracking-tight mb-2">
								{title || "Untitled"}
							</h1>

							{excerpt && (
								<p className="text-lg text-muted-foreground italic mb-6">
									{excerpt}
								</p>
							)}

							<NotebookMetadataHeader
								authorName={authorName ?? null}
								authorPicture={authorPicture ?? null}
								publishedAt={publishedAt ?? null}
								createdAt={createdAt}
								readTime={readTime}
							/>

							<div className="border-t mb-2" />

							<NotebookViewer content={content} />
						</div>
					</div>

					<p id="preview-description" className="sr-only">
						Preview of how this notebook will appear when published
					</p>
				</DialogPrimitive.Content>
			</DialogPortal>
		</Dialog>
	);
}
