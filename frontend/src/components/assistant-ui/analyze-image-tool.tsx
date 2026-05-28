"use client";

import { AlertCircleIcon, EyeIcon } from "lucide-react";
import {
	Image,
	ImageErrorBoundary,
	ImageLoading,
	parseSerializableImage,
} from "@/components/tool-ui/image";

// ============================================================================
// Types
// ============================================================================

interface AnalyzeImageArgs {
	imageUrl: string;
	description?: string;
}

interface AnalyzeImageResult {
	description?: string;
	error?: string;
	[key: string]: unknown;
}

interface AnalyzeImageToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

// ============================================================================
// Helper
// ============================================================================

function extractDomain(url: string): string {
	try {
		const hostname = new URL(url).hostname.replace("www.", "");
		return hostname;
	} catch {
		return "";
	}
}

// ============================================================================
// Sub-components
// ============================================================================

function AnalyzeImageError({ imageUrl, error }: { imageUrl: string; error: string }) {
	return (
		<div className="my-4 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5 p-4 max-w-md">
			<div className="flex items-center gap-4">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
					<AlertCircleIcon className="size-6 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium text-destructive text-sm">Failed to analyze image</p>
					<p className="text-muted-foreground text-xs mt-0.5 truncate">{imageUrl}</p>
					<p className="text-muted-foreground text-xs mt-1">{error}</p>
				</div>
			</div>
		</div>
	);
}

function ParsedImage({ result }: { result: unknown }) {
	const image = parseSerializableImage(result);

	return <Image {...image} maxWidth="420px" />;
}

// ============================================================================
// Main Component
// ============================================================================

export function AnalyzeImageTool({
	args,
	result,
	errored = false,
	isRunning = false,
	status,
}: AnalyzeImageToolProps) {
	const toolArgs = args as AnalyzeImageArgs;
	const imageUrl = toolArgs?.imageUrl || "Unknown";

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

	// Loading state
	if (isRunning) {
		return (
			<div className="my-4">
				<ImageLoading title="Analyzing image..." />
			</div>
		);
	}

	// Error state
	if (errored || toolResult?.error) {
		return (
			<AnalyzeImageError
				imageUrl={imageUrl}
				error={toolResult?.error || "Failed to analyze image"}
			/>
		);
	}

	// Timeout / incomplete state
	if (status === "error" && !toolResult) {
		return (
			<div className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 max-w-md">
				<div className="flex items-center gap-3">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
						<EyeIcon className="size-4 text-amber-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-medium text-amber-600 text-sm">Image analysis timed out</p>
						<p className="text-muted-foreground text-xs mt-0.5 truncate">{imageUrl}</p>
					</div>
				</div>
			</div>
		);
	}

	// No result yet
	if (!toolResult) {
		return (
			<div className="my-4">
				<ImageLoading title="Preparing image analysis..." />
			</div>
		);
	}

	// Build the serializable image data for the shared Image component
	const serializableResult = {
		id: `analyze-img-${imageUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32)}`,
		assetId: `analyze-img-${imageUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32)}`,
		src: imageUrl,
		alt: toolResult.description || "Analyzed image",
		title: "Image Analysis",
		description: toolResult.description,
		domain: extractDomain(imageUrl) || undefined,
		ratio: "16:9" as const,
	};

	// Success - render the image with error boundary
	return (
		<div className="my-4">
			<ImageErrorBoundary>
				<ParsedImage result={serializableResult} />
			</ImageErrorBoundary>
		</div>
	);
}
