"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, getInitials } from "./utils";

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
