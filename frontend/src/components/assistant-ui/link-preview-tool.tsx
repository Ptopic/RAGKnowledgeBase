"use client";

import { AlertCircleIcon, LinkIcon } from "lucide-react";
import {
	MediaCard,
	MediaCardErrorBoundary,
	MediaCardLoading,
	parseSerializableMediaCard,
} from "@/components/tool-ui/media-card";

interface LinkPreviewArgs {
	url: string;
	title?: string;
}

interface LinkPreviewToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

function LinkPreviewError({ url, error }: { url: string; error: string }) {
	return (
		<div className="my-4 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-4 max-w-md">
			<div className="flex items-center gap-4">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
					<AlertCircleIcon className="size-6 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium text-destructive text-sm">Failed to load preview</p>
					<p className="text-muted-foreground text-xs mt-0.5 truncate">{url}</p>
					<p className="text-muted-foreground text-xs mt-1">{error}</p>
				</div>
			</div>
		</div>
	);
}

function ParsedLinkCard({ result }: { result: unknown }) {
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

export function LinkPreviewTool({
	args,
	result,
	errored = false,
	isRunning = false,
	status,
}: LinkPreviewToolProps) {
	const toolArgs = args as LinkPreviewArgs;
	const url = toolArgs?.url || "Unknown URL";

	let toolResult: Record<string, unknown> | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as Record<string, unknown>;
		} else {
			toolResult = result as Record<string, unknown> | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return (
			<div className="my-4">
				<MediaCardLoading title="Generating link preview..." />
			</div>
		);
	}

	if (errored || toolResult?.error) {
		return (
			<LinkPreviewError
				url={url}
				error={String(toolResult?.error || "Failed to load preview")}
			/>
		);
	}

	if (status === "error" && !toolResult) {
		return (
			<div className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 max-w-md">
				<div className="flex items-center gap-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
						<LinkIcon className="size-4 text-amber-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-medium text-amber-600 text-sm">Link preview timed out</p>
						<p className="text-muted-foreground text-xs mt-0.5 truncate">{url}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!toolResult) {
		return (
			<div className="my-4">
				<MediaCardLoading title="Fetching link metadata..." />
			</div>
		);
	}

	return (
		<div className="my-4">
			<MediaCardErrorBoundary>
				<ParsedLinkCard result={toolResult} />
			</MediaCardErrorBoundary>
		</div>
	);
}
