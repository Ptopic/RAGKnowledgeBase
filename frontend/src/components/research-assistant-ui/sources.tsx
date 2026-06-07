"use client";
import { type SourceMessagePartComponent, useThread } from "@assistant-ui/react";
import {
	IconBrandGithub,
	IconBrandNotion,
	IconBrandSlack,
	IconBrandYoutube,
	IconCalendar,
	IconMail,
} from "@tabler/icons-react";
import {
	ExternalLinkIcon,
	FileTextIcon,
	GlobeIcon,
	NotebookIcon,
	VideoIcon,
} from "lucide-react";
import { type ComponentProps, memo, useCallback, useEffect, useRef, useState } from "react";
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
type SourceKind =
	| "webpage"
	| "youtube"
	| "document"
	| "notebook"
	| "calendar"
	| "gmail"
	| "slack"
	| "notion"
	| "github";

/** Map a backend document type to a render kind for the badge. */
const getSourceKind = (sourceType: string): SourceKind => {
	switch (sourceType) {
		case "FILE":
		case "EXTENSION":
		case "UNKNOWN":
			return "document";
		case "CRAWLED_URL":
			return "webpage";
		case "YOUTUBE_VIDEO":
			return "youtube";
		case "NOTEBOOK":
			return "notebook";
		case "GOOGLE_CALENDAR_CONNECTOR":
			return "calendar";
		case "GOOGLE_GMAIL_CONNECTOR":
			return "gmail";
		case "SLACK_CONNECTOR":
			return "slack";
		case "NOTION_CONNECTOR":
			return "notion";
		case "GITHUB_CONNECTOR":
			return "github";
		// Legacy values that the old collapsed code emitted; map them
		// back to their previous behaviour so the badge doesn't go blank.
		case "document":
			return "document";
		case "url":
			return "webpage";
		default:
			// Unknown connector types still get rendered as a webpage
			// badge so we never drop a source on the floor.
			return "webpage";
	}
};

const KIND_CONFIG: Record<
	SourceKind,
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
	notebook: {
		label: "Notebook",
		icon: NotebookIcon,
		badgeClass:
			"bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
	},
	calendar: {
		label: "Calendar",
		icon: IconCalendar,
		badgeClass:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
	},
	gmail: {
		label: "Gmail",
		icon: IconMail,
		badgeClass:
			"bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
	},
	slack: {
		label: "Slack",
		icon: IconBrandSlack,
		badgeClass:
			"bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300",
	},
	notion: {
		label: "Notion",
		icon: IconBrandNotion,
		badgeClass:
			"bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300",
	},
	github: {
		label: "GitHub",
		icon: IconBrandGithub,
		badgeClass:
			"bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
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
	const kind = getSourceKind(sourceType ?? "");

	// File-system types render a static file icon.
	if (kind === "document" || kind === "notebook" || !url) {
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

	// Connector types (calendar, slack, gmail, notion, github) render
	// the brand icon, not a favicon — a Google Calendar entry's url
	// points to calendar.google.com which is not what the user thinks
	// they're looking at.
	if (kind !== "webpage") {
		const KindIcon = KIND_CONFIG[kind].icon;
		return (
			<span
				data-slot="source-icon-connector"
				className={cn(
					"flex size-3 shrink-0 items-center justify-center text-muted-foreground",
					className,
				)}
				{...props}
			>
				<KindIcon className="size-3" />
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
	target = "_blank",
	rel = "noopener noreferrer",
	children,
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
			>
				{children}
			</a>
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
	const kind = getSourceKind(sourceType);
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
		clearTimers();
		openTimerRef.current = setTimeout(() => setOpen(true), 300);
	}, [clearTimers]);

	const handleOpenImmediate = useCallback(() => {
		clearTimers();
		setOpen(true);
	}, [clearTimers]);

	const handleClose = useCallback(() => {
		clearTimers();
		closeTimerRef.current = setTimeout(() => {
			setOpen(false);
		}, 150);
	}, [clearTimers]);
	useEffect(() => {
		return () => {
			clearTimers();
		};
	}, [clearTimers]);
	if (isRunning) return null;

	const kind = getSourceKind(sourceType);
	const config = KIND_CONFIG[kind];
	const KindIcon = config.icon;
	const domain = url ? extractDomain(url) : null;
	const displayTitle = title || domain || "Document";
	// Connector-typed sources (calendar, slack, gmail, etc.) and notebook
	// sources are rendered as a click-through badge that links out to the
	// underlying item. Only "document" sources without a url get the
	// no-navigation behaviour.
	const shouldPreventNav = kind === "document" && !url;

	return (
		<div className="mt-2 mb-1 mr-2 inline-flex">
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<Source
					href={url || "#"}
					onMouseEnter={handleOpenDelayed}
					onMouseLeave={handleClose}
					onFocus={handleOpenDelayed}
					onBlur={handleClose}
					onClick={(e) => {
						if (shouldPreventNav) e.preventDefault();
					}}
				>
					<SourceIcon url={url} sourceType={sourceType} />
					<SourceTitle>{displayTitle}</SourceTitle>
				</Source>
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
