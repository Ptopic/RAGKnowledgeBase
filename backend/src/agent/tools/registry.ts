import { BaseTool } from "@langchain/core/tools";
import type { ToolDefinition, ToolDependencies } from "../types/agent-types";
import { createDisplayImageTool } from "./display-image.tool";
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
