"use client";

import { AlertCircleIcon, PlayIcon, VideoIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface IndexYouTubeArgs {
	videoUrl: string;
}

interface IndexYouTubeResult {
	documentId?: number;
	title?: string;
	videoId?: string;
	videoUrl: string;
	thumbnail?: string;
	status: "transcribing" | "done" | "error" | "timeout";
	error?: string;
	message?: string;
}

interface IndexYouTubeToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

function extractVideoIdFromUrl(url: string): string | null {
	const match = url.match(
		/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
	);
	return match ? match[1] : null;
}

export function IndexYouTubeTool({
	args,
	result,
	errored = false,
	isRunning = false,
}: IndexYouTubeToolProps) {
	const toolArgs = args as IndexYouTubeArgs;

	let toolResult: IndexYouTubeResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as IndexYouTubeResult;
		} else {
			toolResult = result as IndexYouTubeResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	const fallbackVideoId = extractVideoIdFromUrl(toolArgs.videoUrl);
	const thumbnailUrl =
		toolResult?.thumbnail ||
		(fallbackVideoId ? `https://img.youtube.com/vi/${fallbackVideoId}/mqdefault.jpg` : undefined);

	if (isRunning) {
		return <IndexYouTubeLoading videoUrl={toolArgs.videoUrl} thumbnail={thumbnailUrl} />;
	}

	if (errored || toolResult?.error) {
		return (
			<IndexYouTubeError
				videoUrl={toolArgs.videoUrl}
				error={toolResult?.error || "Failed to index YouTube video"}
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
							<VideoIcon className="size-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div className="flex-1 min-w-0">
							<h4 className="font-medium text-sm mb-1">Video Still Processing</h4>
							<p className="text-xs text-muted-foreground">
								{toolResult.message || "Transcription is still in progress. You will be notified when it completes."}
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
				{thumbnailUrl && (
					<div className="relative aspect-video w-full bg-muted overflow-hidden">
						<Image
							src={thumbnailUrl}
							alt={toolResult.title || "YouTube video"}
							fill
							className="object-cover"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="size-12 rounded-full bg-black/70 flex items-center justify-center">
								<PlayIcon className="size-5 text-white ml-0.5" />
							</div>
						</div>
						<div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-green-600/90 text-white text-xs">
							Indexed
						</div>
					</div>
				)}
				<div className="p-4">
					<h4 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
						{toolResult.title || "YouTube Video"}
					</h4>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<VideoIcon className="size-3" />
						<span>Transcript indexed</span>
						{toolResult.documentId && (
							<span className="bg-muted px-1.5 py-0.5 rounded-full">
								ID: {toolResult.documentId}
							</span>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function IndexYouTubeLoading({
	videoUrl,
	thumbnail,
}: {
	videoUrl: string;
	thumbnail?: string;
}): React.ReactElement {
	return (
		<Card className="max-w-md">
			<CardContent className="p-0">
				{thumbnail ? (
					<div className="relative aspect-video w-full bg-muted overflow-hidden">
						<Image
							src={thumbnail}
							alt="Processing..."
							fill
							className="object-cover opacity-60"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="px-3 py-1.5 rounded-md bg-black/60 text-white text-xs flex items-center gap-1.5">
								<VideoIcon className="size-3.5 animate-pulse" />
								Transcribing...
							</div>
						</div>
					</div>
				) : (
					<div className="aspect-video w-full bg-muted flex items-center justify-center">
						<VideoIcon className="size-8 text-muted-foreground animate-pulse" />
					</div>
				)}
				<div className="p-4">
					<Skeleton className="h-4 w-3/4 mb-2" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			</CardContent>
		</Card>
	);
}

function IndexYouTubeError({ videoUrl, error }: { videoUrl: string; error: string }) {
	return (
		<div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
					<AlertCircleIcon className="size-4 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-destructive mb-1">
						Failed to index YouTube video
					</p>
					<p className="text-xs text-muted-foreground truncate mb-2">{videoUrl}</p>
					<p className="text-xs text-destructive/70">{error}</p>
				</div>
			</div>
		</div>
	);
}
