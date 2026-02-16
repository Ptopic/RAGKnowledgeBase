"use client";

import { AlertCircleIcon, ExternalLinkIcon, LinkIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface LinkPreviewArgs {
	url: string;
	title?: string;
}

interface LinkPreviewResult {
	id: string;
	assetId: string;
	kind: "link";
	href: string;
	title: string;
	description?: string;
	thumb?: string;
	domain?: string;
	error?: string;
}

interface LinkPreviewToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
}

export function LinkPreviewTool({
	args,
	result,
	errored = false,
	isRunning = false,
}: LinkPreviewToolProps) {
	const toolArgs = args as LinkPreviewArgs;

	let toolResult: LinkPreviewResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as LinkPreviewResult;
		} else {
			toolResult = result as LinkPreviewResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return <LinkPreviewLoading />;
	}

	if (errored || toolResult?.error) {
		return (
			<LinkPreviewError
				url={toolArgs.url}
				error={toolResult?.error || "Failed to load preview"}
			/>
		);
	}

	if (!toolResult) {
		return null;
	}

	return (
		<Card className="max-w-md overflow-hidden">
			<CardContent className="p-0">
				<a
					href={toolResult.href}
					target="_blank"
					rel="noopener noreferrer"
					className="block hover:bg-muted/50 transition-colors"
				>
					{toolResult.thumb && (
						<div className="aspect-video w-full bg-muted relative overflow-hidden">
							<Image
								src={toolResult.thumb}
								alt={toolResult.title}
								fill
								className="object-cover"
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
							/>
						</div>
					)}
					<div className="p-4">
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<h4 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
									{toolResult.title}
								</h4>
								{toolResult.description && (
									<p className="text-xs text-muted-foreground line-clamp-2 mb-2">
										{toolResult.description}
									</p>
								)}
								<div className="flex items-center gap-1 text-xs text-muted-foreground">
									<LinkIcon className="size-3" />
									<span className="truncate">{toolResult.domain || toolResult.href}</span>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="shrink-0"
								onClick={(e) => {
									e.preventDefault();
									window.open(toolResult.href, "_blank", "noopener,noreferrer");
								}}
							>
								<ExternalLinkIcon className="size-4" />
							</Button>
						</div>
					</div>
				</a>
			</CardContent>
		</Card>
	);
}

function LinkPreviewLoading(): React.ReactElement {
	return (
		<Card className="max-w-md">
			<CardContent className="p-4">
				<div className="flex items-center gap-3 mb-3">
					<div className="size-10 rounded-lg bg-muted flex items-center justify-center">
						<LinkIcon className="size-5 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<Skeleton className="h-4 w-3/4 mb-1" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				</div>
				<Skeleton className="h-3 w-full mb-1" />
				<Skeleton className="h-3 w-2/3" />
			</CardContent>
		</Card>
	);
}

function LinkPreviewError({ url, error }: { url: string; error: string }) {
	return (
		<div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
					<AlertCircleIcon className="size-4 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-destructive mb-1">
						Failed to load preview
					</p>
					<p className="text-xs text-muted-foreground truncate mb-2">{url}</p>
					<p className="text-xs text-destructive/70">{error}</p>
				</div>
			</div>
		</div>
	);
}
