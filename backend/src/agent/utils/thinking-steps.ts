export interface ThinkingStep {
	step_id: string;
	title: string;
	status: "in_progress" | "completed";
	items?: string[];
}

let thinkingStepCounter = 0;

export function resetThinkingStepCounter(): void {
	thinkingStepCounter = 0;
}

export function getNextThinkingStepId(): string {
	thinkingStepCounter++;
	return `thinking-${thinkingStepCounter}`;
}

export function formatThinkingStep(step: ThinkingStep): string {
	return JSON.stringify(step);
}

export function createThinkingStep(
	title: string,
	status: "in_progress" | "completed",
	items?: string[],
): ThinkingStep {
	return {
		step_id: getNextThinkingStepId(),
		title,
		status,
		items,
	};
}

export function getToolThinkingInfo(
	toolName: string,
	toolInput?: Record<string, unknown>,
	toolOutput?: Record<string, unknown>,
): { title: string; items: string[] } {
	switch (toolName) {
		case "search_knowledge_base": {
			const query = (toolInput?.query as string) || "";
			const truncatedQuery =
				query.length > 100 ? `${query.substring(0, 100)}...` : query;
			if (toolOutput) {
				const resultLength = (toolOutput as any).result_length || 0;
				return {
					title: "Searching knowledge base",
					items: [
						`Query: ${truncatedQuery}`,
						resultLength > 0
							? `Found relevant information (${resultLength} chars)`
							: "Search completed",
					],
				};
			}
			return {
				title: "Searching knowledge base",
				items: [`Query: ${truncatedQuery}`],
			};
		}
		case "display_image": {
			const src = (toolInput?.src as string) || "";
			const title = (toolInput?.title as string) || "";
			const alt = (toolInput?.alt as string) || "";
			const displayName = title || alt || src;
			const truncatedName =
				displayName.length > 50
					? `${displayName.substring(0, 50)}...`
					: displayName;
			if (toolOutput) {
				return {
					title: "Displaying image",
					items: [`Image: ${truncatedName}`],
				};
			}
			return {
				title: "Displaying image",
				items: [`Loading: ${truncatedName}`],
			};
		}
		case "analyze_image": {
			const imageUrl = (toolInput?.imageUrl as string) || "";
			const truncatedUrl = imageUrl.length > 60 ? `${imageUrl.substring(0, 60)}...` : imageUrl;
			if (toolOutput) {
				const hasError = typeof toolOutput === "object" && "error" in (toolOutput as object);
				if (hasError) {
					return {
						title: "Analyzing image",
						items: [`URL: ${truncatedUrl}`, `Error: ${(toolOutput as any).error}`],
					};
				}
				return {
					title: "Analyzing image",
					items: [`URL: ${truncatedUrl}`, "Vision analysis complete"],
				};
			}
			return {
				title: "Analyzing image",
				items: [`URL: ${truncatedUrl}`],
			};
		}
		case "index_document": {
			const fileName = (toolInput?.fileName as string) || "";
			if (toolOutput) {
				const hasError = typeof toolOutput === "object" && "error" in (toolOutput as object);
				if (hasError) {
					return {
						title: "Indexing document",
						items: [`File: ${fileName}`, `Error: ${(toolOutput as any).error}`],
					};
				}
				return {
					title: "Indexing document",
					items: [`File: ${fileName}`, "Document indexed successfully"],
				};
			}
			return {
				title: "Indexing document",
				items: [`File: ${fileName}`, "Processing..."],
			};
		}
		case "index_webpage": {
			const url = (toolInput?.url as string) || "";
			const truncatedUrl = url.length > 60 ? `${url.substring(0, 60)}...` : url;
			if (toolOutput) {
				const hasError = typeof toolOutput === "object" && "error" in (toolOutput as object);
				if (hasError) {
					return {
						title: "Indexing web page",
						items: [`URL: ${truncatedUrl}`, `Error: ${(toolOutput as any).error}`],
					};
				}
				return {
					title: "Indexing web page",
					items: [`URL: ${truncatedUrl}`, "Page indexed successfully"],
				};
			}
			return {
				title: "Indexing web page",
				items: [`URL: ${truncatedUrl}`, "Crawling..."],
			};
		}
		case "index_youtube": {
			const videoUrl = (toolInput?.videoUrl as string) || "";
			const truncatedUrl = videoUrl.length > 60 ? `${videoUrl.substring(0, 60)}...` : videoUrl;
			if (toolOutput) {
				const hasError = typeof toolOutput === "object" && "error" in (toolOutput as object);
				if (hasError) {
					return {
						title: "Indexing YouTube video",
						items: [`URL: ${truncatedUrl}`, `Error: ${(toolOutput as any).error}`],
					};
				}
				return {
					title: "Indexing YouTube video",
					items: [`URL: ${truncatedUrl}`, "Video indexed successfully"],
				};
			}
			return {
				title: "Indexing YouTube video",
				items: [`URL: ${truncatedUrl}`, "Transcribing..."],
			};
		}
		default:
			return {
				title: toolName.replace(/_/g, " "),
				items: [],
			};
	}
}

export function getInitialThinkingStep(userQuery: string): ThinkingStep {
	const truncatedQuery =
		userQuery.length > 80 ? `${userQuery.substring(0, 80)}...` : userQuery;
	return createThinkingStep("Understanding your request", "in_progress", [
		`Processing: ${truncatedQuery}`,
	]);
}
