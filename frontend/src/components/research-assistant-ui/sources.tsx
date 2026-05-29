"use client";

import { type SourceMessagePartComponent, useThread } from "@assistant-ui/react";
import {
	ExternalLinkIcon,
	FileTextIcon,
	GlobeIcon,
	VideoIcon,
} from "lucide-react";
import { type ComponentProps, memo, useCallback, useRef, useState } from "react";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge, type BadgeProps, badgeVariants } from "./badge";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const extractDomain = (url: string): string => {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};

const getDomainInitial = (url: string): string => {
	const domain = extractDomain(url);
	return domain.charAt(0).toUpperCase();
};

/** Derive a YouTube thumbnail URL from a video URL, or return null. */
const getYouTubeThumbnail = (url: string): string | null => {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.replace(/^www\./, "");
		const isYouTube =
			host === "youtube.com" ||
			host === "youtu.be" ||
			host === "m.youtube.com";
		if (!isYouTube) return null;

		let videoId: string | null = null;
		if (host === "youtu.be") {
			videoId = parsed.pathname.slice(1);
		} else {
			videoId = parsed.searchParams.get("v");
		}
		if (!videoId) return null;
		return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
	} catch {
		return null;
	}
};

/** Determine the content type label for a source. */
const getSourceKind = (
	sourceType: string,
	url?: string,
): "webpage" | "youtube" | "document" => {
	if (sourceType === "document") return "document";
	if (url && getYouTubeThumbnail(url)) return "youtube";
	return "webpage";
};

const KIND_CONFIG: Record<
	string,
	{ label: string; icon: typeof GlobeIcon; badgeClass: string }
> = {
	webpage: {
		label: "Webpage",
		icon: GlobeIcon,
		badgeClass:
			"bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
	},
	youtube: {
		label: "YouTube",
		icon: VideoIcon,
		badgeClass:
			"bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
	},
	document: {
		label: "Document",
		icon: FileTextIcon,
		badgeClass:
			"bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
	},
};

// ---------------------------------------------------------------------------
// SourceIcon — favicon for URLs, file icon for documents
// ---------------------------------------------------------------------------

function SourceIcon({
	url,
	sourceType,
	className,
	...props
}: ComponentProps<"span"> & { url?: string; sourceType?: string }) {
	const [hasError, setHasError] = useState(false);

	if (sourceType === "document" || !url) {
		return (
			<span
				data-slot="source-icon-document"
				className={cn(
					"flex size-3 shrink-0 items-center justify-center text-muted-foreground",
					className,
				)}
				{...props}
			>
				<FileTextIcon className="size-3" />
			</span>
		);
	}

	const domain = extractDomain(url);

	if (hasError) {
		return (
			<span
				data-slot="source-icon-fallback"
				className={cn(
					"flex size-3 shrink-0 items-center justify-center rounded-sm bg-muted font-medium text-[10px]",
					className,
				)}
				{...props}
			>
				{getDomainInitial(url)}
			</span>
		);
	}

	return (
		<img
			data-slot="source-icon"
			src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
			alt=""
			className={cn("size-3 shrink-0 rounded-sm", className)}
			onError={() => setHasError(true)}
			{...(props as ComponentProps<"img">)}
		/>
	);
}

// ---------------------------------------------------------------------------
// SourceTitle
// ---------------------------------------------------------------------------

function SourceTitle({ className, ...props }: ComponentProps<"span">) {
	return (
		<span
			data-slot="source-title"
			className={cn("max-w-37.5 truncate", className)}
			{...props}
		/>
	);
}

// ---------------------------------------------------------------------------
// Source (badge wrapper)
// ---------------------------------------------------------------------------

export type SourceProps = Omit<BadgeProps, "asChild"> &
	ComponentProps<"a"> & {
		asChild?: boolean;
	};

function Source({
	className,
	variant,
	size,
	asChild = false,
	target = "_blank",
	rel = "noopener noreferrer",
	...props
}: SourceProps) {
	return (
		<Badge
			asChild
			variant={variant}
			size={size}
			className={cn(
				"cursor-pointer outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
				className,
			)}
		>
			<a
				data-slot="source"
				target={target}
				rel={rel}
				{...(props as ComponentProps<"a">)}
			/>
		</Badge>
	);
}

// ---------------------------------------------------------------------------
// SourceHoverCard — rich hover card content
// ---------------------------------------------------------------------------

function SourceHoverCard({
	url,
	title,
	sourceType,
}: {
	url?: string;
	title?: string;
	sourceType: string;
}) {
	const kind = getSourceKind(sourceType, url);
	const config = KIND_CONFIG[kind];
	const KindIcon = config.icon;
	const domain = url ? extractDomain(url) : null;
	const displayTitle = title || domain || "Untitled";
	const thumbnailUrl = url ? getYouTubeThumbnail(url) : null;

	return (
		<div data-slot="source-hover-card" className="space-y-2.5">
			{thumbnailUrl && (
				<div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
					<img
						src={thumbnailUrl}
						alt={displayTitle}
						className="size-full object-cover"
						onError={(e) => {
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				</div>
			)}

			{!thumbnailUrl && kind === "document" && (
				<div className="flex size-10 items-center justify-center rounded-md bg-muted">
					<FileTextIcon className="size-5 text-muted-foreground" />
				</div>
			)}

			<p className="text-sm font-semibold leading-snug">
				{displayTitle}
			</p>

			{domain && kind !== "document" && (
				<p className="break-words text-xs text-muted-foreground">
					{domain}
				</p>
			)}

			<div className="flex items-center gap-2">
				<span
					className={cn(
						"inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none",
						config.badgeClass,
					)}
				>
					<KindIcon className="size-2.5" />
					{config.label}
				</span>

				{url && (
					<span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
						<ExternalLinkIcon className="size-2.5 shrink-0" />
						<span className="break-words">{domain}</span>
					</span>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// SourcesImpl — the SourceMessagePartComponent
// ---------------------------------------------------------------------------

const SourcesImpl: SourceMessagePartComponent = ({
	url,
	title,
	sourceType,
}) => {
	const isRunning = useThread((s) => s.isRunning);
	const [open, setOpen] = useState(false);
	const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const justClosedRef = useRef(false);

	const clearTimers = useCallback(() => {
		if (openTimerRef.current) {
			clearTimeout(openTimerRef.current);
			openTimerRef.current = null;
		}
		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	}, []);

	const handleOpenDelayed = useCallback(() => {
		if (justClosedRef.current) return;
		clearTimers();
		openTimerRef.current = setTimeout(() => setOpen(true), 300);
	}, [clearTimers]);

	const handleOpenImmediate = useCallback(() => {
		justClosedRef.current = false;
		clearTimers();
		setOpen(true);
	}, [clearTimers]);

	const handleClose = useCallback(() => {
		clearTimers();
		closeTimerRef.current = setTimeout(() => {
			setOpen(false);
			justClosedRef.current = true;
			setTimeout(() => {
				justClosedRef.current = false;
			}, 200);
		}, 150);
	}, [clearTimers]);

	if (sourceType !== "url" && sourceType !== "document") return null;
	if (isRunning) return null;

	const domain = url ? extractDomain(url) : null;
	const displayTitle = title || domain || "Document";

	return (
		<div className="mt-2 mb-1 mr-2 inline-flex">
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<button
					type="button"
					onMouseEnter={handleOpenDelayed}
					onMouseLeave={handleClose}
					onFocus={handleOpenDelayed}
					onBlur={handleClose}
					className="inline-flex appearance-none border-none bg-transparent p-0"
				>
					<Source
						href={url || "#"}
						onClick={(e) => {
							if (sourceType === "document" && !url) e.preventDefault();
						}}
					>
						<SourceIcon url={url} sourceType={sourceType} />
						<SourceTitle>{displayTitle}</SourceTitle>
					</Source>
				</button>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				side="top"
				sideOffset={6}
				onMouseEnter={handleOpenImmediate}
				onMouseLeave={handleClose}
				className="w-72 p-3"
			>
				<SourceHoverCard
					url={url}
					title={title}
					sourceType={sourceType}
				/>
			</PopoverContent>
		</Popover>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Compound component export
// ---------------------------------------------------------------------------

const Sources = memo(SourcesImpl) as unknown as SourceMessagePartComponent & {
	Root: typeof Source;
	Icon: typeof SourceIcon;
	Title: typeof SourceTitle;
};

Sources.displayName = "Sources";
Sources.Root = Source;
Sources.Icon = SourceIcon;
Sources.Title = SourceTitle;

export {
	Sources,
	Source,
	SourceIcon,
	SourceTitle,
	badgeVariants as sourceVariants,
};
