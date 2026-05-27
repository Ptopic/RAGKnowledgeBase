"use client";

import { AlertCircleIcon, EyeIcon, ImageIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyzeImageArgs {
	imageUrl: string;
}

interface AnalyzeImageResult {
	imageUrl: string;
	description?: string;
	status: "analyzing" | "done" | "error" | "timeout";
	error?: string;
	message?: string;
}

interface AnalyzeImageToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

export function AnalyzeImageTool({
	args,
	result,
	errored = false,
	isRunning = false,
}: AnalyzeImageToolProps) {
	const toolArgs = args as AnalyzeImageArgs;

	let toolResult: AnalyzeImageResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as AnalyzeImageResult;
		} else {
			toolResult = result as AnalyzeImageResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return <AnalyzeImageLoading imageUrl={toolArgs.imageUrl} />;
	}

	if (errored || toolResult?.error) {
		return (
			<AnalyzeImageError
				imageUrl={toolArgs.imageUrl}
				error={toolResult?.error || "Failed to analyze image"}
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
							<ImageIcon className="size-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div className="flex-1 min-w-0">
							<h4 className="font-medium text-sm mb-1">Image Analysis In Progress</h4>
							<p className="text-xs text-muted-foreground">
								{toolResult.message || "Analysis is still running. You will be notified when it completes."}
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
				<div className="aspect-video w-full bg-muted relative overflow-hidden">
					<Image
						src={toolResult.imageUrl}
						alt={toolResult.description || "Analyzed image"}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					/>
					<div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs flex items-center gap-1">
						<EyeIcon className="size-3" />
						Analyzed
					</div>
				</div>
				{toolResult.description && (
					<div className="p-4">
						<h4 className="font-semibold text-sm mb-1">Image Analysis</h4>
						<p className="text-xs text-muted-foreground line-clamp-4">
							{toolResult.description}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function AnalyzeImageLoading({ imageUrl }: { imageUrl: string }): React.ReactElement {
	return (
		<Card className="max-w-md">
			<CardContent className="p-0">
				<div className="aspect-video w-full bg-muted relative overflow-hidden">
					<Image
						src={imageUrl}
						alt="Analyzing..."
						fill
						className="object-cover opacity-60"
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					/>
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="px-3 py-1.5 rounded-md bg-black/60 text-white text-xs flex items-center gap-1.5">
							<EyeIcon className="size-3.5 animate-pulse" />
							Analyzing...
						</div>
					</div>
				</div>
				<div className="p-4">
					<Skeleton className="h-4 w-3/4 mb-2" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			</CardContent>
		</Card>
	);
}

function AnalyzeImageError({ imageUrl, error }: { imageUrl: string; error: string }) {
	return (
		<div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
					<AlertCircleIcon className="size-4 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-destructive mb-1">
						Image analysis failed
					</p>
					<p className="text-xs text-muted-foreground truncate mb-2">{imageUrl}</p>
					<p className="text-xs text-destructive/70">{error}</p>
				</div>
			</div>
		</div>
	);
}
