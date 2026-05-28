"use client";

import { AlertCircleIcon, FileIcon } from "lucide-react";
import {
	MediaCard,
	MediaCardErrorBoundary,
	MediaCardLoading,
	parseSerializableMediaCard,
	type SerializableMediaCard,
} from "@/components/tool-ui/media-card";

// ============================================================================
// Types
// ============================================================================

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
	[key: string]: unknown;
}

interface IndexDocumentToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

// ============================================================================
// Helpers
// ============================================================================

function extractFileExtension(fileName: string): string {
	const parts = fileName.split(".");
	if (parts.length > 1) {
		return parts[parts.length - 1].toUpperCase();
	}
	return "File";
}

// ============================================================================
// Sub-components
// ============================================================================

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

function ParsedDocumentCard({ result }: { result: unknown }) {
	const card = parseSerializableMediaCard(result);

	return (
		<MediaCard
			{...card}
			maxWidth="420px"
			responseActions={[{ id: "open", label: "Open", variant: "default" }]}
			onResponseAction={(id) => {
				if (id === "open" && card.href) {
					window.open(card.href, "_blank", "noopener,noreferrer");
				}
			}}
		/>
	);
}

// ============================================================================
// Main Component
// ============================================================================

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
						<FileIcon className="size-4 text-amber-600" />
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

	const docId = String(toolResult.documentId || fileName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32));
	const serializableResult: SerializableMediaCard = {
		id: docId,
		assetId: docId,
		kind: "link",
		title: toolResult.title || toolResult.fileName || fileName,
		description: "Document indexed and searchable",
		domain: extractFileExtension(toolResult.fileName || fileName),
		href: toolArgs?.fileUrl || undefined,
		thumb: undefined,
		ratio: undefined,
	};

	return (
		<div className="my-4">
			<MediaCardErrorBoundary>
				<ParsedDocumentCard result={serializableResult} />
			</MediaCardErrorBoundary>
		</div>
	);
}
