import { BaseTool } from "@langchain/core/tools";
import type { ToolDefinition, ToolDependencies } from "../types/agent-types";
import { createAnalyzeImageTool } from "./analyze-image.tool";
import { createDisplayImageTool } from "./display-image.tool";
import { createGenerateFollowupQuestionsTool } from "./generate-followup-questions.tool";
import { createIndexDocumentTool } from "./index-document.tool";
import { createIndexWebpageTool } from "./index-webpage.tool";
import { createIndexYouTubeTool } from "./index-youtube.tool";
import { createSearchKnowledgeBaseTool } from "./knowledge-base.tool";
import { createLinkPreviewTool } from "./link-preview.tool";

const BUILTIN_TOOLS: ToolDefinition[] = [
	{
		name: "search_knowledge_base",
		description:
			"Search the user's personal knowledge base for relevant information",
		factory: (deps) => createSearchKnowledgeBaseTool(deps),
		requires: ["searchSpaceId", "userId", "connectorService", "prisma"],
		enabledByDefault: true,
	},
	{
		name: "link_preview",
		description: "Fetch metadata for a URL to display a rich preview card",
		factory: () => createLinkPreviewTool(),
		requires: [],
		enabledByDefault: true,
	},
	{
		name: "display_image",
		description: "Display an image in the chat with metadata",
		factory: () => createDisplayImageTool(),
		requires: [],
		enabledByDefault: true,
	},
	{
		name: "analyze_image",
		description:
			"Analyze an image from a URL using vision AI and return a detailed text description",
		factory: (deps) => createAnalyzeImageTool(deps),
		requires: ["imageAnalysisService"],
		enabledByDefault: true,
	},
	{
		name: "index_document",
		description:
			"Upload and index a document file into the user's knowledge base",
		factory: (deps) => createIndexDocumentTool(deps),
		requires: ["queueService", "prisma"],
		enabledByDefault: true,
	},
	{
		name: "index_webpage",
		description:
			"Crawl and index a web page URL into the user's knowledge base",
		factory: (deps) => createIndexWebpageTool(deps),
		requires: ["queueService", "prisma"],
		enabledByDefault: true,
	},
	{
		name: "index_youtube",
		description:
			"Transcribe and index a YouTube video into the user's knowledge base",
		factory: (deps) => createIndexYouTubeTool(deps),
		requires: ["queueService", "prisma"],
		enabledByDefault: true,
	},
	{
		name: "generate_followup_questions",
		description:
			"Call at the end of the response to emit follow-up suggestions to the user. NEVER write follow-ups as text — ONLY call this tool.",
		factory: () => createGenerateFollowupQuestionsTool(),
		requires: [],
		enabledByDefault: true,
	},
];

export function buildTools(
	dependencies: ToolDependencies,
	enabledTools?: string[],
	disabledTools?: string[],
): BaseTool[] {
	const enabled =
		enabledTools && enabledTools.length > 0
			? new Set(enabledTools)
			: new Set(
					BUILTIN_TOOLS.filter((tool) => tool.enabledByDefault !== false).map(
						(tool) => tool.name,
					),
				);

	if (disabledTools) {
		for (const toolName of disabledTools) {
			enabled.delete(toolName);
		}
	}

	const tools: BaseTool[] = [];
	for (const toolDef of BUILTIN_TOOLS) {
		if (!enabled.has(toolDef.name)) {
			continue;
		}

		const missingDeps = (toolDef.requires || []).filter(
			(dep) => dependencies[dep] === undefined,
		);

		if (missingDeps.length > 0) {
			throw new Error(
				`Tool '${toolDef.name}' requires dependencies: ${missingDeps.join(", ")}`,
			);
		}

		tools.push(toolDef.factory(dependencies));
	}

	return tools;
}

export function getDefaultEnabledTools(): string[] {
	return BUILTIN_TOOLS.filter((tool) => tool.enabledByDefault !== false).map(
		(tool) => tool.name,
	);
}
