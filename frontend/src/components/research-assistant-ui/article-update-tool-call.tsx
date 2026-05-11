"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
	CheckIcon,
	ChevronDownIcon,
	LoaderIcon,
	XCircleIcon,
} from "lucide-react";
import { TOOL_MESSAGES } from "@/components/ui/Chat/constants";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type SplitDiffSnippet = {
	type: "split_snippet";
	truncatedTop: boolean;
	truncatedBottom: boolean;
	before: {
		fromLine: number;
		lines: string[];
		highlightLineIndexes: number[];
	};
	after: {
		fromLine: number;
		lines: string[];
		highlightLineIndexes: number[];
	};
};

interface ArticleUpdateOutput {
	data?: {
		summary?: string;
		changedFields?: string[];
		changes?: {
			title?: { before: string; after: string };
			ingress?: { before: string; after: string };
			content?: { hunks: SplitDiffSnippet[] };
		};
	};
}

function toSingleOrMultiLineSnippet(
	before: string,
	after: string,
): SplitDiffSnippet {
	const beforeLines = before.split(/\r?\n/);
	const afterLines = after.split(/\r?\n/);
	const rowCount = Math.max(beforeLines.length, afterLines.length);

	const beforeOut = [...beforeLines];
	const afterOut = [...afterLines];

	while (beforeOut.length < rowCount) beforeOut.push("");
	while (afterOut.length < rowCount) afterOut.push("");

	const highlight: number[] = [];
	for (let i = 0; i < rowCount; i++) {
		if (beforeOut[i] !== afterOut[i]) highlight.push(i);
	}

	return {
		type: "split_snippet",
		truncatedTop: false,
		truncatedBottom: false,
		before: {
			fromLine: 1,
			lines: beforeOut,
			highlightLineIndexes: highlight,
		},
		after: {
			fromLine: 1,
			lines: afterOut,
			highlightLineIndexes: highlight,
		},
	};
}

function parseOutput(result: unknown): ArticleUpdateOutput | undefined {
	if (result === undefined || result === null) return undefined;

	if (typeof result === "string") {
		try {
			const parsed = JSON.parse(result);
			return parseOutput(parsed);
		} catch {
			return undefined;
		}
	}

	if (typeof result !== "object") return undefined;

	const obj = result as Record<string, unknown>;

	if ("data" in obj && typeof obj.data === "object" && obj.data !== null) {
		return result as ArticleUpdateOutput;
	}

	if ("changes" in obj || ("summary" in obj && "changedFields" in obj)) {
		return { data: obj as ArticleUpdateOutput["data"] };
	}

	return undefined;
}

const ArticleUpdateToolCall: ToolCallMessagePartComponent = ({
	toolName,
	status,
	result,
}) => {
	const statusType = status?.type ?? "complete";
	const isRunning = statusType === "running";
	const isCompleted = statusType === "complete";
	const isError =
		status?.type === "incomplete" && status.reason !== "cancelled";

	const output = parseOutput(result);
	const changes = output?.data?.changes;
	const summary = output?.data?.summary;

	const titleSnippet =
		changes?.title &&
		typeof changes.title.before === "string" &&
		typeof changes.title.after === "string"
			? toSingleOrMultiLineSnippet(changes.title.before, changes.title.after)
			: null;

	const ingressSnippet =
		changes?.ingress &&
		typeof changes.ingress.before === "string" &&
		typeof changes.ingress.after === "string"
			? toSingleOrMultiLineSnippet(
					changes.ingress.before,
					changes.ingress.after,
				)
			: null;

	const contentSnippets = changes?.content?.hunks;
	const hasChanges = !!(
		titleSnippet ||
		ingressSnippet ||
		(contentSnippets && contentSnippets.length > 0)
	);

	const displayName =
		TOOL_MESSAGES[toolName as keyof typeof TOOL_MESSAGES] || toolName;
	const label = isCompleted
		? summary || "Article updated"
		: isError
			? `Failed to update article`
			: displayName;

	const StatusIcon = isRunning
		? LoaderIcon
		: isCompleted
			? CheckIcon
			: XCircleIcon;

	const renderSnippet = (snippet: SplitDiffSnippet) => {
		return (
			<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
				<div className="rounded border bg-muted/30 p-2">
					<p className="mb-1 text-xs font-medium text-muted-foreground">
						Before
					</p>
					<pre className="whitespace-pre-wrap text-xs">
						{snippet.before.lines.join("\n")}
					</pre>
				</div>
				<div className="rounded border bg-muted/30 p-2">
					<p className="mb-1 text-xs font-medium text-muted-foreground">
						After
					</p>
					<pre className="whitespace-pre-wrap text-xs">
						{snippet.after.lines.join("\n")}
					</pre>
				</div>
			</div>
		);
	};

	return (
		<Collapsible
			defaultOpen
			className="mt-3 mb-2 w-full rounded-lg border py-3"
		>
			<CollapsibleTrigger
				className={cn(
					"group/trigger flex w-full items-center gap-2 px-4 text-sm transition-colors",
				)}
			>
				<StatusIcon
					className={cn(
						"size-4 shrink-0",
						isRunning && "animate-spin",
						isCompleted && "text-green-600 dark:text-green-400",
						isError && "text-red-500",
					)}
				/>
				<span className="grow text-start leading-none">{label}</span>
				{isCompleted && hasChanges && (
					<span className="text-xs text-muted-foreground mr-1">
						View changes
					</span>
				)}
				<ChevronDownIcon
					className={cn(
						"size-4 shrink-0 transition-transform duration-200 ease-out",
						"group-data-[state=closed]/trigger:-rotate-90",
						"group-data-[state=open]/trigger:rotate-0",
					)}
				/>
			</CollapsibleTrigger>

			<CollapsibleContent className="overflow-hidden text-sm data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
				<div className="mt-3 flex flex-col gap-3 border-t pt-3 px-4">
					{isCompleted && hasChanges && (
						<>
							{titleSnippet && (
								<div>
									<p className="mb-1 text-xs font-medium text-muted-foreground">
										Title
									</p>
									{renderSnippet(titleSnippet)}
								</div>
							)}
							{ingressSnippet && (
								<div>
									<p className="mb-1 text-xs font-medium text-muted-foreground">
										Ingress
									</p>
									{renderSnippet(ingressSnippet)}
								</div>
							)}
							{contentSnippets && contentSnippets.length > 0 && (
								<div>
									<p className="mb-1 text-xs font-medium text-muted-foreground">
										Content
									</p>
									<div className="space-y-3">
										{contentSnippets.map((snippet, index) => (
											<div
												// biome-ignore lint/suspicious/noArrayIndexKey: stable snippet rendering
												key={index}
											>
												{renderSnippet(snippet)}
											</div>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
};

export { ArticleUpdateToolCall };
