"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import documentsClientRequests from "@/api/documents/authClientRequests";
import type { DocumentWithChunks } from "@/api/documents/types";
import { JsonMetadataViewer } from "@/components/json-metadata-viewer";
import { MarkdownViewer } from "@/components/markdown-viewer";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Document } from "./types";

export function RowActions({
	document,
	deleteDocument,
	refreshDocuments,
}: {
	document: Document;
	deleteDocument: (id: number) => Promise<boolean>;
	refreshDocuments: () => Promise<void>;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [chunksOpen, setChunksOpen] = useState(false);
	const [chunksLoading, setChunksLoading] = useState(false);
	const [documentWithChunks, setDocumentWithChunks] =
		useState<DocumentWithChunks | null>(null);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const ok = await deleteDocument(document.id);
			if (ok) toast.success("Document deleted successfully");
			else toast.error("Failed to delete document");
			await refreshDocuments();
		} catch (error) {
			console.error("Error deleting document:", error);
			toast.error("Failed to delete document");
		} finally {
			setIsDeleting(false);
			setIsOpen(false);
		}
	};

	const handleViewChunks = async () => {
		setChunksOpen(true);
		setChunksLoading(true);
		try {
			const data = await documentsClientRequests.getDocumentWithChunks(document.id);
			setDocumentWithChunks(data);
		} catch (error) {
			console.error("Error loading chunks:", error);
			toast.error("Failed to load document chunks");
		} finally {
			setChunksLoading(false);
		}
	};

	return (
		<div className="flex justify-end">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<JsonMetadataViewer
						title={document.title}
						metadata={document.document_metadata}
						trigger={
							<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
								View Metadata
							</DropdownMenuItem>
						}
					/>
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							handleViewChunks();
						}}
					>
						View Chunks
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
						<AlertDialogTrigger asChild>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={(e) => {
									e.preventDefault();
									setIsOpen(true);
								}}
							>
								Delete
							</DropdownMenuItem>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={(e) => {
										e.preventDefault();
										handleDelete();
									}}
									disabled={isDeleting}
								>
									{isDeleting ? "Deleting..." : "Delete"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog
				open={chunksOpen}
				onOpenChange={(open) => {
					setChunksOpen(open);
					if (!open) setDocumentWithChunks(null);
				}}
			>
				<DialogContent className="max-w-5xl">
					<DialogHeader>
						<DialogTitle>Document Chunks</DialogTitle>
						<DialogDescription>
							{document.title}
							{documentWithChunks
								? ` • ${documentWithChunks.chunks.length} chunks`
								: ""}
						</DialogDescription>
					</DialogHeader>

					{chunksLoading ? (
						<div className="py-6 text-sm text-muted-foreground">Loading chunks...</div>
					) : !documentWithChunks ? (
						<div className="py-6 text-sm text-muted-foreground">
							No chunk data available.
						</div>
					) : (
						<ScrollArea className="h-[70vh] pr-2">
							<div className="space-y-4">
								{documentWithChunks.chunks.map((chunk, idx) => (
									<div key={chunk.id} className="rounded-md border p-3">
										<div className="mb-2 text-xs text-muted-foreground">
											Chunk {idx + 1} • #{chunk.id}
										</div>
										<MarkdownViewer content={chunk.content} className="max-w-none" />
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
