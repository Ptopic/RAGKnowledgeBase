"use client";

import { AlertCircleIcon, GlobeIcon } from "lucide-react";
import {
	Article,
	ArticleErrorBoundary,
	ArticleLoading,
	parseSerializableArticle,
} from "@/components/tool-ui/article";

// ============================================================================
// Types
// ============================================================================

interface IndexWebpageArgs {
	url: string;
	maxLength?: number;
}

interface IndexWebpageResult {
	documentId?: string | number;
	title?: string;
	description?: string;
	url?: string;
	error?: string;
	[key: string]: unknown;
}

interface IndexWebpageToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

// ============================================================================
// Helpers
// ============================================================================

function extractDomain(url: string): string {
	try {
		return new URL(url).hostname.replace("www.", "");
	} catch {
		return "";
	}
}

// ============================================================================
// Sub-components
// ============================================================================

function IndexWebpageError({ url, error }: { url: string; error: string }) {
	return (
		<div className="my-4 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-4 max-w-md">
			<div className="flex items-center gap-4">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
					<AlertCircleIcon className="size-6 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium text-destructive text-sm">Failed to index webpage</p>
					<p className="text-muted-foreground text-xs mt-0.5 truncate">{url}</p>
					<p className="text-muted-foreground text-xs mt-1">{error}</p>
				</div>
			</div>
		</div>
	);
}

function ParsedArticle({ result }: { result: unknown }) {
	const article = parseSerializableArticle(result);

	return (
		<Article
			{...article}
			maxWidth="480px"
			responseActions={[{ id: "open", label: "Open Source", variant: "default" }]}
			onResponseAction={(id) => {
				if (id === "open" && article.href) {
					window.open(article.href, "_blank", "noopener,noreferrer");
				}
			}}
		/>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function IndexWebpageTool({
	args,
	result,
	errored = false,
	isRunning = false,
	status,
}: IndexWebpageToolProps) {
	const toolArgs = args as IndexWebpageArgs;
	const url = toolArgs?.url || "Unknown URL";

	let toolResult: IndexWebpageResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as IndexWebpageResult;
		} else {
			toolResult = result as IndexWebpageResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return (
			<div className="my-4">
				<ArticleLoading title={`Indexing ${url}...`} />
			</div>
		);
	}

	if (errored || toolResult?.error) {
		return (
			<IndexWebpageError
				url={url}
				error={toolResult?.error || "Failed to index webpage"}
			/>
		);
	}

	if (status === "error" && !toolResult) {
		return (
			<div className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 max-w-md">
				<div className="flex items-center gap-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
						<GlobeIcon className="size-4 text-amber-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-medium text-amber-600 text-sm">Webpage indexing timed out</p>
						<p className="text-muted-foreground text-xs mt-0.5 truncate">{url}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!toolResult) {
		return (
			<div className="my-4">
				<ArticleLoading title={`Extracting content from ${url}...`} />
			</div>
		);
	}

	const docId = String(toolResult.documentId || url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32));
	const domain = extractDomain(toolResult.url || url);
	const serializableResult = {
		id: docId,
		assetId: docId,
		kind: "article" as const,
		title: toolResult.title || domain || url,
		description: toolResult.description,
		href: toolResult.url || url,
		domain: domain || undefined,
	};

	return (
		<div className="my-4">
			<ArticleErrorBoundary>
				<ParsedArticle result={serializableResult} />
			</ArticleErrorBoundary>
		</div>
	);
}
