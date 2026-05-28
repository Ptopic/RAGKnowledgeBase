"use client";

import { AlertCircleIcon, FileTextIcon } from "lucide-react";
import {
	MediaCardErrorBoundary,
	MediaCardLoading,
} from "@/components/tool-ui/media-card";

interface IndexDocumentArgs {
	fileName: string;
	fileUrl?: string;
	mimeType?: string;
}

interface IndexDocumentResult {
	documentId?: string | number;
	title?: string;
	fileName?: string;
	error?: string;
	sources?: Array<{ id: string; title: string; url: string; type: string }>;
	[key: string]: unknown;
}

interface IndexDocumentToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

function extractFileExtension(fileName: string): string {
	const parts = fileName.split(".");
	if (parts.length > 1) {
		return parts[parts.length - 1].toUpperCase();
	}
	return "FILE";
}

const INDEX_DOC_COLOR = "bg-sky-500/10 text-sky-600";

function IndexDocumentError({ fileName, error }: { fileName: string; error: string }) {
	return (
		<div className="my-4 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-4 max-w-md">
			<div className="flex items-center gap-4">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
					<AlertCircleIcon className="size-6 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium text-destructive text-sm">Failed to index document</p>
					<p className="text-muted-foreground text-xs mt-0.5 truncate">{fileName}</p>
					<p className="text-muted-foreground text-xs mt-1">{error}</p>
				</div>
			</div>
		</div>
	);
}

function DocumentCard({
	title,
	fileName,
	description,
}: {
	title: string;
	fileName: string;
	description?: string;
}) {
	const ext = extractFileExtension(fileName);

	return (
		<div className="my-4 max-w-md rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20">
			<div className="flex items-center gap-4 p-4">
				<div className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${INDEX_DOC_COLOR}`}>
					<FileTextIcon className="size-7" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider ${INDEX_DOC_COLOR}`}>
							{ext}
						</span>
						<span className="text-xs text-muted-foreground">Indexed</span>
					</div>
					<h3 className="font-semibold text-foreground text-sm leading-tight truncate">
						{title}
					</h3>
					{description && (
						<p className="mt-1 text-muted-foreground text-xs leading-relaxed line-clamp-2">
							{description}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

export function IndexDocumentTool({
	args,
	result,
	errored = false,
	isRunning = false,
	status,
}: IndexDocumentToolProps) {
	const toolArgs = args as IndexDocumentArgs;
	const fileName = toolArgs?.fileName || "Unknown file";

	let toolResult: IndexDocumentResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as IndexDocumentResult;
		} else {
			toolResult = result as IndexDocumentResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return (
			<div className="my-4">
				<MediaCardLoading title={`Indexing ${fileName}...`} />
			</div>
		);
	}

	if (errored || toolResult?.error) {
		return (
			<IndexDocumentError
				fileName={fileName}
				error={toolResult?.error || "Failed to index document"}
			/>
		);
	}

	if (status === "error" && !toolResult) {
		return (
			<div className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 max-w-md">
				<div className="flex items-center gap-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
						<FileTextIcon className="size-4 text-amber-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-medium text-amber-600 text-sm">Document indexing timed out</p>
						<p className="text-muted-foreground text-xs mt-0.5 truncate">{fileName}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!toolResult) {
		return (
			<div className="my-4">
				<MediaCardLoading title={`Processing ${fileName}...`} />
			</div>
		);
	}

	return (
		<div className="my-4">
			<MediaCardErrorBoundary>
				<DocumentCard
					title={toolResult.title || toolResult.fileName || fileName}
					fileName={toolResult.fileName || fileName}
					description="Document indexed and searchable in your knowledge base"
				/>
			</MediaCardErrorBoundary>
		</div>
	);
}
