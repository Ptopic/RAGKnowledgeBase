"use client";

import { AlertCircle, BookOpen, Globe, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import useGetPublicNotebookBySlug from "@/api/notebooks/hooks/useGetPublicNotebookBySlug";
import { NotebookViewer } from "@/components/notebook/NotebookViewer";
import { Button } from "@/components/ui/button";

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

interface PublicNotebookDetailClientProps {
	slug: string;
}

export default function PublicNotebookDetailClient({ slug }: PublicNotebookDetailClientProps) {
	const { data: notebook, isLoading, error } = useGetPublicNotebookBySlug(slug);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		if (error) {
			setNotFound(true);
		}
	}, [error]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-2">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">Loading notebook...</p>
				</div>
			</div>
		);
	}

	if (notFound || !notebook) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="flex flex-col items-center gap-4 text-center max-w-md">
					<AlertCircle className="h-12 w-12 text-muted-foreground" />
					<h1 className="text-2xl font-bold">Notebook Not Found</h1>
					<p className="text-muted-foreground">
						This notebook doesn&apos;t exist or is not publicly available.
					</p>
					<Button variant="outline" onClick={() => window.location.href = "/public/notebooks"}>
						Browse Notebooks
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-14 items-center px-4">
					<div className="flex items-center gap-2">
						<Globe className="h-5 w-5 text-muted-foreground" />
						<h1 className="text-lg font-semibold">{notebook.title}</h1>
					</div>
					<div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
						<BookOpen className="h-4 w-4" />
						<span>Published notebook</span>
					</div>
				</div>
			</div>

			<div className="flex-1 flex flex-col overflow-y-auto">
				<div className="max-w-3xl mx-auto w-full px-6 py-12">
					<h1 className="text-4xl font-bold tracking-tight mb-2">
						{notebook.title}
					</h1>

					{notebook.excerpt && (
						<p className="text-lg text-muted-foreground italic mb-8">
							{notebook.excerpt}
						</p>
					)}

					<div className="text-xs text-muted-foreground mb-8">
						{notebook.published_at
							? `Published ${formatDate(notebook.published_at)}`
							: formatDate(notebook.created_at)}
					</div>

					<NotebookViewer content={notebook.content} />
				</div>
			</div>
		</div>
	);
}
