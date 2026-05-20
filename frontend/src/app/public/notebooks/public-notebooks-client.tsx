"use client";

import { BookOpen, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useGetPublicNotebooks from "@/api/notebooks/hooks/useGetPublicNotebooks";
import type { PublicNotebookListItem } from "@/api/notebooks/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, formatDate } from "@/components/notebook/utils";

const PAGE_SIZE = 5;

function NotebookCard({ notebook }: { notebook: PublicNotebookListItem }) {
	const displayDate = notebook.published_at
		? `Published ${formatDate(notebook.published_at)}`
		: formatDate(notebook.created_at);

	return (
		<Link
			href={`/public/notebooks/${notebook.slug}`}
			className="group flex gap-6 py-6 transition-all"
		>
			<div className="flex-1 min-w-0 flex flex-col justify-between">
				<div>
					<div className="flex items-center gap-2 mb-3">
						<Avatar className="h-6 w-6">
							<AvatarImage src={notebook.author_picture ?? undefined} alt={notebook.author_name ?? "Author"} />
							<AvatarFallback className="text-[10px] font-medium">{getInitials(notebook.author_name)}</AvatarFallback>
						</Avatar>
						<span className="text-sm text-muted-foreground truncate">
							{notebook.author_name || "Unknown Author"}
						</span>
						<span className="text-muted-foreground/40">·</span>
						<span className="text-sm text-muted-foreground">{displayDate}</span>
					</div>

					<h2 className="text-xl font-bold group-hover:text-primary transition-colors mb-2 leading-tight">
						{notebook.title}
					</h2>

					{notebook.excerpt && (
						<p className="text-sm text-muted-foreground line-clamp-2">
							{notebook.excerpt}
						</p>
					)}
				</div>
			</div>

			<div className="hidden sm:flex shrink-0 w-32 md:w-48 items-center justify-center rounded-md bg-muted/50 border border-border/50">
				<BookOpen className="h-8 w-8 text-muted-foreground/30" />
			</div>
		</Link>
	);
}

export default function PublicNotebooksClient() {
	const [allNotebooks, setAllNotebooks] = useState<PublicNotebookListItem[]>([]);
	const [skip, setSkip] = useState(0);
	const [total, setTotal] = useState(0);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const loadingRef = useRef(false);

	const { data, isLoading, error } = useGetPublicNotebooks(
		undefined,
		skip,
		PAGE_SIZE,
	);

	useEffect(() => {
		if (data) {
			if (skip === 0) {
				setAllNotebooks(data.items);
			} else {
				setAllNotebooks((prev) => [...prev, ...data.items]);
			}
			setTotal(data.total);
			setIsLoadingMore(false);
			loadingRef.current = false;
		}
	}, [data]);

	const handleShowMore = useCallback(() => {
		if (loadingRef.current) return;
		loadingRef.current = true;
		setIsLoadingMore(true);
		setSkip((prev) => prev + PAGE_SIZE);
	}, []);

	const hasMore = allNotebooks.length < total;

	if (isLoading && skip === 0) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-2">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Loading notebooks...</p>
				</div>
			</div>
		);
	}

	if (error && skip === 0) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-4 text-center max-w-md">
					<BookOpen className="h-12 w-12 text-muted-foreground" />
					<h1 className="text-2xl font-bold">Error Loading Notebooks</h1>
					<p className="text-muted-foreground">
						Failed to load published notebooks. Please try again later.
					</p>
				</div>
			</div>
		);
	}

	if (!isLoading && allNotebooks.length === 0) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-4 text-center max-w-md">
					<BookOpen className="h-12 w-12 text-muted-foreground" />
					<h1 className="text-2xl font-bold">No Published Notebooks</h1>
					<p className="text-muted-foreground">
						There are no published notebooks available yet.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-14 items-center px-4">
					<div className="flex items-center gap-2">
						<Globe className="h-5 w-5 text-muted-foreground" />
						<h1 className="text-lg font-semibold">Published Notebooks</h1>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="flex flex-col max-w-4xl mx-auto">
					{allNotebooks.map((notebook, index) => (
						<div key={notebook.id}>
							<NotebookCard notebook={notebook} />
							{index < allNotebooks.length - 1 && <hr className="border-border" />}
						</div>
					))}
				</div>

				{hasMore && (
					<div className="flex justify-center mt-8">
						<Button
							variant="outline"
							size="lg"
							onClick={handleShowMore}
							disabled={isLoadingMore}
						>
							{isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Show more
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
