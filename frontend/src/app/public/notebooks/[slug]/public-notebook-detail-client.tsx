"use client";

import { AlertCircle, ArrowLeft, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import useGetPublicNotebookBySlug from "@/api/notebooks/hooks/useGetPublicNotebookBySlug";
import { estimateReadTime } from "@/components/notebook/estimateReadTime";
import { NotebookMetadataHeader } from "@/components/notebook/NotebookMetadataHeader";
import { NotebookViewer } from "@/components/notebook/NotebookViewer";
import { Button } from "@/components/ui/button";

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
					<Button variant="outline" asChild>
						<Link href="/public/notebooks">Browse Notebooks</Link>
					</Button>
				</div>
			</div>
		);
	}

	const readTime = estimateReadTime(notebook.content);

	return (
		<div className="min-h-screen bg-background">
			<div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-14 items-center px-4">
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="icon" asChild>
							<Link href="/public/notebooks">
								<ArrowLeft className="h-5 w-5" />
								<span className="sr-only">Back to all notebooks</span>
							</Link>
						</Button>
						<Globe className="h-5 w-5 text-muted-foreground" />
						<h1 className="text-lg font-semibold">{notebook.title}</h1>
					</div>
				</div>
			</div>

			<div className="flex-1 flex flex-col overflow-y-auto">
				<div className="max-w-3xl mx-auto w-full px-6 py-12">
					<Link
						href="/public/notebooks"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to all notebooks
					</Link>

					{notebook.headline_image_url && (
						<div className="w-full mb-8 aspect-video rounded-lg border bg-muted/50 overflow-hidden">
							<img
								src={notebook.headline_image_url}
								alt=""
								className="w-full h-full object-cover"
							/>
						</div>
					)}

					<h1 className="text-4xl font-bold tracking-tight mb-2">
						{notebook.title}
					</h1>

					{notebook.excerpt && (
						<p className="text-lg text-muted-foreground italic mb-6">
							{notebook.excerpt}
						</p>
					)}

					<NotebookMetadataHeader
						authorName={notebook.author_name}
						authorPicture={notebook.author_picture}
						publishedAt={notebook.published_at}
						createdAt={notebook.created_at}
						readTime={readTime}
					/>

					<div className="border-t mb-2" />

					<NotebookViewer content={notebook.content} />
				</div>
			</div>
		</div>
	);
}
