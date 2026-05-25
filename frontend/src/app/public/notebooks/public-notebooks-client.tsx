"use client";

import { BookOpen, CircleX, Globe, ListFilter, Loader2, ArrowUpDown } from "lucide-react";
import NextImage from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useGetPublicNotebooks from "@/api/notebooks/hooks/useGetPublicNotebooks";
import type { PublicNotebookListItem } from "@/api/notebooks/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getInitials, formatDate } from "@/components/notebook/utils";
import { useDebounce } from "@/hooks/use-debounce";

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

			<div className="hidden sm:flex shrink-0 w-32 md:w-48 items-center justify-center rounded-md bg-muted/50 border border-border/50 overflow-hidden relative aspect-video">
				{notebook.headline_image_url ? (
					<NextImage
						src={notebook.headline_image_url}
						alt={`Cover for ${notebook.title}`}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 128px, 192px"
					/>
				) : (
					<BookOpen className="h-8 w-8 text-muted-foreground/30" />
				)}
			</div>
		</Link>
	);
}

function SearchSortToolbar({
	search,
	onSearchChange,
	sortOrder,
	onSortOrderChange,
}: {
	search: string;
	onSearchChange: (value: string) => void;
	sortOrder: "desc" | "asc";
	onSortOrderChange: (value: "desc" | "asc") => void;
}) {
	return (
		<div className="flex items-center gap-3 mb-6">
			<div className="relative flex-1">
				<Input
					className="peer ps-9"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Search notebooks..."
					type="text"
					aria-label="Search notebooks"
				/>
				<div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
					<ListFilter size={16} strokeWidth={2} aria-hidden="true" />
				</div>
				{Boolean(search) && (
					<button
						className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 transition-colors hover:text-foreground"
						aria-label="Clear search"
						onClick={() => onSearchChange("")}
					>
						<CircleX size={16} strokeWidth={2} aria-hidden="true" />
					</button>
				)}
			</div>
			<Select value={sortOrder} onValueChange={(v) => onSortOrderChange(v as "desc" | "asc")}>
				<SelectTrigger className="w-[160px]">
					<ArrowUpDown className="mr-2 h-4 w-4" />
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="desc">Newest first</SelectItem>
					<SelectItem value="asc">Oldest first</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}

function PageHeader() {
	return (
		<div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-14 items-center px-4">
				<div className="flex items-center gap-2">
					<Globe className="h-5 w-5 text-muted-foreground" />
					<h1 className="text-lg font-semibold">Published Notebooks</h1>
				</div>
			</div>
		</div>
	);
}

export default function PublicNotebooksClient() {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 400);
	const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
	const [allNotebooks, setAllNotebooks] = useState<PublicNotebookListItem[]>([]);
	const [skip, setSkip] = useState(0);
	const [total, setTotal] = useState(0);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const loadingRef = useRef(false);

	const { data, isLoading, error } = useGetPublicNotebooks({
		search: debouncedSearch || undefined,
		sort_by: "published_at",
		sort_order: sortOrder,
		skip,
		limit: PAGE_SIZE,
	});

	useEffect(() => {
		setSkip(0);
		setAllNotebooks([]);
	}, [debouncedSearch, sortOrder]);

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
			<div className="min-h-screen bg-background">
				<PageHeader />
				<div className="container mx-auto px-4 py-8">
					<div className="flex flex-col max-w-4xl mx-auto">
						<SearchSortToolbar
							search={search}
							onSearchChange={setSearch}
							sortOrder={sortOrder}
							onSortOrderChange={setSortOrder}
						/>
						<div className="flex items-center justify-center py-16">
							<div className="flex flex-col items-center gap-4 text-center max-w-md">
								<BookOpen className="h-12 w-12 text-muted-foreground" />
								<h1 className="text-2xl font-bold">No Published Notebooks</h1>
								<p className="text-muted-foreground">
									{debouncedSearch
										? "No published notebooks found."
										: "There are no published notebooks available yet."}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<PageHeader />
			<div className="container mx-auto px-4 py-8">
				<div className="flex flex-col max-w-4xl mx-auto">
					<SearchSortToolbar
						search={search}
						onSearchChange={setSearch}
						sortOrder={sortOrder}
						onSortOrderChange={setSortOrder}
					/>
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
