"use client";

import { AlertCircleIcon, VideoIcon } from "lucide-react";
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

interface IndexYoutubeArgs {
	videoUrl: string;
}

interface IndexYoutubeResult {
	documentId?: string | number;
	title?: string;
	videoUrl?: string;
	thumbnail?: string;
	error?: string;
	[key: string]: unknown;
}

interface IndexYoutubeToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

// ============================================================================
// Helpers
// ============================================================================

function extractVideoIdFromUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.hostname.includes("youtu.be")) {
			return parsed.pathname.slice(1);
		}
		return parsed.searchParams.get("v") || "";
	} catch {
		return "";
	}
}

function getYoutubeThumbnail(videoUrl: string): string {
	const videoId = extractVideoIdFromUrl(videoUrl);
	if (videoId) {
		return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
	}
	return "";
}

// ============================================================================
// Sub-components
// ============================================================================

function IndexYoutubeError({ videoUrl, error }: { videoUrl: string; error: string }) {
	return (
		<div className="my-4 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-4 max-w-md">
			<div className="flex items-center gap-4">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
					<AlertCircleIcon className="size-6 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium text-destructive text-sm">Failed to index YouTube video</p>
					<p className="text-muted-foreground text-xs mt-0.5 truncate">{videoUrl}</p>
					<p className="text-muted-foreground text-xs mt-1">{error}</p>
				</div>
			</div>
		</div>
	);
}

function ParsedYoutubeCard({ result }: { result: unknown }) {
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

export function IndexYoutubeTool({
	args,
	result,
	errored = false,
	isRunning = false,
	status,
}: IndexYoutubeToolProps) {
	const toolArgs = args as IndexYoutubeArgs;
	const videoUrl = toolArgs?.videoUrl || "Unknown URL";

	let toolResult: IndexYoutubeResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as IndexYoutubeResult;
		} else {
			toolResult = result as IndexYoutubeResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return (
			<div className="my-4">
				<MediaCardLoading title="Indexing YouTube video..." />
			</div>
		);
	}

	if (errored || toolResult?.error) {
		return (
			<IndexYoutubeError
				videoUrl={videoUrl}
				error={toolResult?.error || "Failed to index YouTube video"}
			/>
		);
	}

	if (status === "error" && !toolResult) {
		return (
			<div className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 max-w-md">
				<div className="flex items-center gap-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
						<VideoIcon className="size-4 text-amber-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-medium text-amber-600 text-sm">YouTube indexing timed out</p>
						<p className="text-muted-foreground text-xs mt-0.5 truncate">{videoUrl}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!toolResult) {
		return (
			<div className="my-4">
				<MediaCardLoading title="Processing YouTube video..." />
			</div>
		);
	}

	const docId = String(toolResult.documentId || extractVideoIdFromUrl(videoUrl) || videoUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32));
	const thumbnail = toolResult.thumbnail || getYoutubeThumbnail(toolResult.videoUrl || videoUrl);
	const serializableResult: SerializableMediaCard = {
		id: docId,
		assetId: docId,
		kind: "video",
		title: toolResult.title || "YouTube Video",
		description: "Transcript indexed and searchable",
		href: toolResult.videoUrl || videoUrl,
		thumb: thumbnail || undefined,
		domain: "youtube.com",
		ratio: "16:9",
	};

	return (
		<div className="my-4">
			<MediaCardErrorBoundary>
				<ParsedYoutubeCard result={serializableResult} />
			</MediaCardErrorBoundary>
		</div>
	);
}
