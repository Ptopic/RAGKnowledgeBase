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
		case "link_preview": {
			const url = (toolInput?.url as string) || "";
			const truncatedUrl = url.length > 80 ? `${url.substring(0, 80)}...` : url;
			if (toolOutput) {
				const title = (toolOutput as any).title || "Link";
				const domain = (toolOutput as any).domain || "";
				const hasError = "error" in (toolOutput as object);
				if (hasError) {
					return {
						title: "Fetching link preview",
						items: [
							`URL: ${truncatedUrl}`,
							`Error: ${(toolOutput as any).error || "Failed to fetch"}`,
						],
					};
				}
				return {
					title: "Fetching link preview",
					items: [
						`URL: ${truncatedUrl}`,
						`Title: ${title.substring(0, 60)}${title.length > 60 ? "..." : ""}`,
						domain ? `Domain: ${domain}` : "Preview loaded",
					],
				};
			}
			return {
				title: "Fetching link preview",
				items: [`URL: ${truncatedUrl}`],
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
