"use client";

import { AlertCircleIcon, FileIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface IndexDocumentArgs {
	filePath: string;
	fileName: string;
}

interface IndexDocumentResult {
	documentId?: number;
	title?: string;
	fileName: string;
	status: "uploading" | "processing" | "done" | "error" | "timeout";
	error?: string;
	message?: string;
}

function getMimeIcon(fileName: string): string {
	const ext = fileName.split(".").pop()?.toLowerCase() || "";
	const mimeMap: Record<string, string> = {
		pdf: "📄",
		doc: "📝",
		docx: "📝",
		txt: "📃",
		md: "📋",
		csv: "📊",
		xls: "📊",
		xlsx: "📊",
		ppt: "📊",
		pptx: "📊",
		png: "🖼️",
		jpg: "🖼️",
		jpeg: "🖼️",
		gif: "🖼️",
	};
	return mimeMap[ext] || "📎";
}

interface IndexDocumentToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

export function IndexDocumentTool({
	args,
	result,
	errored = false,
	isRunning = false,
}: IndexDocumentToolProps) {
	const toolArgs = args as IndexDocumentArgs;

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
		return <IndexDocumentLoading fileName={toolArgs.fileName} />;
	}

	if (errored || toolResult?.error) {
		return (
			<IndexDocumentError
				fileName={toolArgs.fileName}
				error={toolResult?.error || "Failed to index document"}
			/>
		);
	}

	if (!toolResult) {
		return null;
	}

	if (toolResult.status === "timeout") {
		return (
			<Card className="max-w-md">
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 text-lg">
							{getMimeIcon(toolResult.fileName)}
						</div>
						<div className="flex-1 min-w-0">
							<h4 className="font-medium text-sm mb-1">Document Still Processing</h4>
							<p className="text-xs text-muted-foreground">
								{toolResult.message || "Indexing is still in progress. You will be notified when it completes."}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="max-w-md">
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="size-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 text-lg">
						{getMimeIcon(toolResult.fileName)}
					</div>
					<div className="flex-1 min-w-0">
						<h4 className="font-semibold text-sm mb-1 line-clamp-1">
							{toolResult.title || toolResult.fileName}
						</h4>
						<p className="text-xs text-muted-foreground mb-2">
							Document indexed and searchable
						</p>
						{toolResult.documentId && (
							<span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
								ID: {toolResult.documentId}
							</span>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function IndexDocumentLoading({ fileName }: { fileName: string }): React.ReactElement {
	return (
		<Card className="max-w-md">
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">
						{getMimeIcon(fileName)}
					</div>
					<div className="flex-1 min-w-0">
						<h4 className="font-medium text-sm mb-1 line-clamp-1">{fileName}</h4>
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<FileIcon className="size-3 animate-pulse" />
							Processing document...
						</div>
					</div>
				</div>
				<div className="mt-3">
					<Skeleton className="h-3 w-full mb-1" />
					<Skeleton className="h-3 w-2/3" />
				</div>
			</CardContent>
		</Card>
	);
}

function IndexDocumentError({ fileName, error }: { fileName: string; error: string }) {
	return (
		<div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
					<AlertCircleIcon className="size-4 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-destructive mb-1">
						Failed to index document
					</p>
					<p className="text-xs text-muted-foreground truncate mb-2">{fileName}</p>
					<p className="text-xs text-destructive/70">{error}</p>
				</div>
			</div>
		</div>
	);
}
