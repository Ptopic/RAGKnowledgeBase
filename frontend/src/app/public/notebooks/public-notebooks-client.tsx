"use client";

import { BookOpen, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import useGetPublicNotebooks from "@/api/notebooks/hooks/useGetPublicNotebooks";

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

export default function PublicNotebooksClient() {
	const { data: notebooks, isLoading, error } = useGetPublicNotebooks();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-2">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Loading notebooks...</p>
				</div>
			</div>
		);
	}

	if (error) {
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

	if (!notebooks || notebooks.length === 0) {
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
					{notebooks.map((notebook) => (
						<Link
							key={notebook.id}
							href={`/public/notebooks/${notebook.slug}`}
							className="group block rounded-lg border bg-card p-6 hover:border-primary/50 hover:shadow-md transition-all"
						>
							<h2 className="text-lg font-semibold group-hover:text-primary transition-colors mb-2">
								{notebook.title}
							</h2>
							{notebook.excerpt && (
								<p className="text-sm text-muted-foreground line-clamp-3 mb-4">
									{notebook.excerpt}
								</p>
							)}
							<div className="text-xs text-muted-foreground">
								{notebook.published_at
									? `Published ${formatDate(notebook.published_at)}`
									: formatDate(notebook.created_at)}
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
