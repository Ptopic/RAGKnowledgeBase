"use client";

import { BoxIcon, WrenchIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LinkPreviewTool } from "./link-preview-tool";
import { DisplayImageTool } from "./display-image-tool";
import { SearchKnowledgeBaseTool } from "./search-knowledge-base-tool";
import { formatToolName } from "@/lib/chat/format-utils";

interface ToolCallRendererProps {
	toolName: string;
	args: unknown;
	result?: unknown;
	errored?: boolean;
	isRunning?: boolean;
	status?: "success" | "error";
}

export function ToolCallRenderer({
	toolName,
	args,
	result,
	errored,
	isRunning,
	status,
}: ToolCallRendererProps) {
	switch (toolName) {
		case "link_preview":
			return (
				<LinkPreviewTool
					args={args}
					result={result}
					errored={errored}
					isRunning={isRunning}
					status={status}
				/>
			);

		case "display_image":
			return (
				<DisplayImageTool
					args={args}
					result={result}
					errored={errored}
					isRunning={isRunning}
					status={status}
				/>
			);

		case "search_knowledge_base":
			return (
				<SearchKnowledgeBaseTool
					args={args}
					result={result}
					errored={errored}
					isRunning={isRunning}
					status={status}
				/>
			);

		default:
			return <UnknownTool toolName={toolName} args={args} />;
	}
}

function UnknownTool({ toolName, args }: { toolName: string; args: unknown }) {
	const formattedToolName = formatToolName(toolName);
	const formattedArgs = formatArgs(args);

	return (
		<Card className="max-w-md border-dashed">
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
						<WrenchIcon className="size-4 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-2">
							<h4 className="font-medium text-sm">{formattedToolName}</h4>
							<span className="text-xs text-muted-foreground">Tool</span>
						</div>
						<details className="group">
							<summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
								<BoxIcon className="size-3" />
								View arguments
							</summary>
							<pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-x-auto">
								{formattedArgs}
							</pre>
						</details>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function formatArgs(args: unknown): string {
	if (!args) return "{}";

	if (typeof args === "string") {
		try {
			return JSON.stringify(JSON.parse(args), null, 2);
		} catch {
			return args;
		}
	}

	if (typeof args === "object") {
		return JSON.stringify(args, null, 2);
	}

	return String(args);
}
