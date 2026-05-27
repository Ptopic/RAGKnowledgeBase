"use client";

import { AlertCircleIcon, GlobeIcon, LinkIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface IndexWebpageArgs {
	url: string;
}

interface IndexWebpageResult {
	documentId?: number;
	title?: string;
	url: string;
	description?: string;
	ogImage?: string;
	status: "crawling" | "done" | "error" | "timeout";
	error?: string;
	message?: string;
}

function extractDomain(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}

interface IndexWebpageToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

export function IndexWebpageTool({
	args,
	result,
	errored = false,
	isRunning = false,
}: IndexWebpageToolProps) {
	const toolArgs = args as IndexWebpageArgs;

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
		return <IndexWebpageLoading url={toolArgs.url} />;
	}

	if (errored || toolResult?.error) {
		return (
			<IndexWebpageError
				url={toolArgs.url}
				error={toolResult?.error || "Failed to index web page"}
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
						<div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
							<GlobeIcon className="size-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div className="flex-1 min-w-0">
							<h4 className="font-medium text-sm mb-1">Web Page Still Processing</h4>
							<p className="text-xs text-muted-foreground">
								{toolResult.message || "Crawling is still in progress. You will be notified when it completes."}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="max-w-md overflow-hidden">
			<CardContent className="p-0">
				{toolResult.ogImage && (
					<div className="aspect-video w-full bg-muted relative overflow-hidden">
						<Image
							src={toolResult.ogImage}
							alt={toolResult.title || "Web page"}
							fill
							className="object-cover"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>
					</div>
				)}
				<div className="p-4">
					<div className="flex items-start gap-3">
						<div className="size-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
							<GlobeIcon className="size-4 text-green-600 dark:text-green-400" />
						</div>
						<div className="flex-1 min-w-0">
							<h4 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
								{toolResult.title || extractDomain(toolResult.url)}
							</h4>
							{toolResult.description && (
								<p className="text-xs text-muted-foreground line-clamp-2 mb-2">
									{toolResult.description}
								</p>
							)}
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<LinkIcon className="size-3" />
								<span className="truncate">{extractDomain(toolResult.url)}</span>
							</div>
							{toolResult.documentId && (
								<span className="mt-2 inline-block text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
									Indexed • ID: {toolResult.documentId}
								</span>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function IndexWebpageLoading({ url }: { url: string }): React.ReactElement {
	return (
		<Card className="max-w-md">
			<CardContent className="p-4">
				<div className="flex items-center gap-3 mb-3">
					<div className="size-10 rounded-lg bg-muted flex items-center justify-center">
						<GlobeIcon className="size-5 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<Skeleton className="h-4 w-3/4 mb-1" />
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<LinkIcon className="size-3" />
							<span className="truncate">{extractDomain(url)}</span>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<GlobeIcon className="size-3 animate-pulse" />
					Crawling and indexing...
				</div>
			</CardContent>
		</Card>
	);
}

function IndexWebpageError({ url, error }: { url: string; error: string }) {
	return (
		<div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
					<AlertCircleIcon className="size-4 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-destructive mb-1">
						Failed to index web page
					</p>
					<p className="text-xs text-muted-foreground truncate mb-2">{url}</p>
					<p className="text-xs text-destructive/70">{error}</p>
				</div>
			</div>
		</div>
	);
}
