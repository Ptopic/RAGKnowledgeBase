"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string | null | undefined): string {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return name.charAt(0).toUpperCase();
}

function formatDate(dateStr: string): string {
	try {
		return new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch {
		return dateStr;
	}
}

interface NotebookMetadataHeaderProps {
	authorName: string | null;
	authorPicture: string | null;
	publishedAt: string | null;
	createdAt: string;
	readTime: number;
}

export function NotebookMetadataHeader({
	authorName,
	authorPicture,
	publishedAt,
	createdAt,
	readTime,
}: NotebookMetadataHeaderProps) {
	const displayDate = publishedAt
		? `Published ${formatDate(publishedAt)}`
		: formatDate(createdAt);

	return (
		<div className="flex items-center gap-3 mb-8">
			<Avatar className="h-9 w-9">
				<AvatarImage src={authorPicture ?? undefined} alt={authorName ?? "Author"} />
				<AvatarFallback className="text-xs font-medium">{getInitials(authorName)}</AvatarFallback>
			</Avatar>
			<div className="flex flex-col">
				<span className="text-sm font-medium leading-tight">
					{authorName || "Unknown Author"}
				</span>
				<span className="text-xs text-muted-foreground">
					{readTime} min read · {displayDate}
				</span>
			</div>
		</div>
	);
}
