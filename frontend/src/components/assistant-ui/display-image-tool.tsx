"use client";

import { AlertCircleIcon, ImageIcon } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DisplayImageArgs {
	src: string;
	alt?: string;
	title?: string;
	description?: string;
}

interface DisplayImageResult {
	id: string;
	assetId: string;
	src: string;
	alt?: string;
	title?: string;
	description?: string;
	domain?: string;
	ratio?: string;
	error?: string;
}

interface DisplayImageToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
}

export function DisplayImageTool({
	args,
	result,
	errored = false,
	isRunning = false,
}: DisplayImageToolProps) {
	const toolArgs = args as DisplayImageArgs;

	let toolResult: DisplayImageResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as DisplayImageResult;
		} else {
			toolResult = result as DisplayImageResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return <DisplayImageLoading />;
	}

	if (errored || toolResult?.error) {
		return (
			<DisplayImageError
				src={toolArgs.src}
				error={toolResult?.error || "Failed to display image"}
			/>
		);
	}

	if (!toolResult) {
		return null;
	}

	const imageUrl = toolResult.src || toolArgs.src;

	return (
		<div className="max-w-md">
			<Card className="overflow-hidden">
				<CardContent className="p-0">
					<div
						className={cn(
							"relative group",
							toolResult.ratio === "square" && "aspect-square",
							toolResult.ratio === "portrait" && "aspect-[3/4]",
							!toolResult.ratio && "aspect-video",
						)}
					>
						<Image
							src={imageUrl}
							alt={toolResult.alt || toolArgs.alt || toolResult.title || "Image"}
							fill
							className="object-cover"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>
						<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
							<ImageIcon className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
						</div>
					</div>

					{(toolResult.title || toolResult.description || toolResult.domain) && (
						<div className="p-4">
							{toolResult.title && (
								<h4 className="font-semibold text-sm mb-1">{toolResult.title}</h4>
							)}
							{toolResult.description && (
								<p className="text-xs text-muted-foreground mb-2">
									{toolResult.description}
								</p>
							)}
							{toolResult.domain && (
								<p className="text-xs text-muted-foreground">Source: {toolResult.domain}</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function DisplayImageLoading(): React.ReactElement {
	return (
		<Card className="max-w-md">
			<CardContent className="p-0">
				<div className="aspect-video w-full bg-muted">
					<div className="w-full h-full flex items-center justify-center">
						<ImageIcon className="size-8 text-muted-foreground animate-pulse" />
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

function DisplayImageError({ src, error }: { src: string; error: string }) {
	return (
		<div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-4">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
					<AlertCircleIcon className="size-4 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-destructive mb-1">
						Failed to display image
					</p>
					<p className="text-xs text-muted-foreground truncate mb-2">{src}</p>
					<p className="text-xs text-destructive/70">{error}</p>
				</div>
			</div>
		</div>
	);
}
