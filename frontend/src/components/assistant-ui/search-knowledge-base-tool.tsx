"use client";

import { AlertCircleIcon, FileTextIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SearchKnowledgeBaseArgs {
	query: string;
	search_space_id: string;
	limit?: number;
	filters?: Record<string, string | number | boolean>;
}

interface SearchResultItem {
	id: string;
	document_id: string;
	document_title: string;
	content: string;
	score?: number;
	metadata?: Record<string, string | number | boolean>;
}

interface SearchKnowledgeBaseResult {
	query: string;
	results: SearchResultItem[];
	total: number;
	error?: string;
}

interface SearchKnowledgeBaseToolProps {
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

export function SearchKnowledgeBaseTool({
	args,
	result,
	errored = false,
	isRunning = false,
	status: _status = "success",
}: SearchKnowledgeBaseToolProps) {
	const toolArgs = args as SearchKnowledgeBaseArgs;

	let toolResult: SearchKnowledgeBaseResult | undefined;
	try {
		if (typeof result === "string") {
			toolResult = JSON.parse(result) as SearchKnowledgeBaseResult;
		} else {
			toolResult = result as SearchKnowledgeBaseResult | undefined;
		}
	} catch {
		toolResult = undefined;
	}

	if (isRunning) {
		return <SearchKnowledgeBaseLoading />;
	}

	if (errored || toolResult?.error) {
		return (
			<SearchKnowledgeBaseError
				query={toolArgs.query}
				error={toolResult?.error || "Search failed"}
			/>
		);
	}

	if (!toolResult) {
		return null;
	}

	return (
		<Card className="max-w-2xl">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
							<SearchIcon className="size-4 text-blue-600 dark:text-blue-400" />
						</div>
						<CardTitle className="text-base">Search Results</CardTitle>
					</div>
					{typeof toolResult.total === "number" && (
						<span className="text-xs text-muted-foreground">
							{toolResult.total} {toolResult.total === 1 ? "result" : "results"}
						</span>
					)}
				</div>
				{toolResult.query && (
					<p className="text-sm text-muted-foreground pl-10">
						Query: &quot;{toolResult.query}&quot;
					</p>
				)}
			</CardHeader>
			<CardContent className="pt-0">
				{!toolResult.results || toolResult.results.length === 0 ? (
					<p className="text-sm text-muted-foreground pl-10">
						No results found
					</p>
				) : (
					<div className="space-y-2">
						{toolResult.results.map((item, index) => (
							<SearchResultItem
								key={item.id || index}
								item={item}
								index={index}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function SearchResultItem({
	item,
	index,
}: {
	item: SearchResultItem;
	index: number;
}) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className="border rounded-lg overflow-hidden">
				<CollapsibleTrigger
					className={cn(
						"w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-muted/50 transition-colors",
						isOpen && "bg-muted/30",
					)}
				>
					<span className="flex items-center justify-center size-6 rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
						{index + 1}
					</span>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<FileTextIcon className="size-3.5 text-muted-foreground shrink-0" />
							<p className="text-sm font-medium line-clamp-1">
								{item.document_title || "Untitled Document"}
							</p>
						</div>
						<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
							{item.content}
						</p>
					</div>
					{item.score && (
						<span className="text-xs text-muted-foreground shrink-0">
							{Math.round(item.score * 100)}% match
						</span>
					)}
				</CollapsibleTrigger>
				<CollapsibleContent className="px-4 pb-3">
					<div className="pl-9 pt-2 border-t border-dashed">
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">
							{item.content}
						</p>
						{item.metadata && Object.keys(item.metadata).length > 0 && (
							<div className="mt-2 flex flex-wrap gap-2">
								{Object.entries(item.metadata)
									.slice(0, 3)
									.map(([key, value]) => (
										<span
											key={key}
											className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
										>
											{key}: {String(value)}
										</span>
									))}
							</div>
						)}
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}

function SearchKnowledgeBaseLoading(): React.ReactElement {
	return (
		<Card className="max-w-2xl">
			<CardContent className="p-4">
				<div className="flex items-center gap-3 mb-4">
					<div className="size-8 rounded-lg bg-muted flex items-center justify-center">
						<SearchIcon className="size-4 text-muted-foreground" />
					</div>
					<div className="flex-1">
						<Skeleton className="h-5 w-32 mb-1" />
						<p className="text-xs text-muted-foreground">Searching...</p>
					</div>
				</div>
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="border rounded-lg p-3">
							<Skeleton className="h-4 w-3/4 mb-2" />
							<Skeleton className="h-3 w-full mb-1" />
							<Skeleton className="h-3 w-2/3" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function SearchKnowledgeBaseError({
	query,
	error,
}: {
	query: string;
	error: string;
}) {
	return (
		<div className="max-w-2xl rounded-lg border border-destructive/20 bg-destructive/5 p-4">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
					<AlertCircleIcon className="size-4 text-destructive" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-destructive mb-1">
						Search failed
					</p>
					<p className="text-xs text-muted-foreground mb-2">
						Query: &quot;{query}&quot;
					</p>
					<p className="text-xs text-destructive/70">{error}</p>
				</div>
			</div>
		</div>
	);
}
