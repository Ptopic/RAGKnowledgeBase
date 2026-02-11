import type { BaseTool } from "@langchain/core/tools";
import type { PrismaService } from "src/prisma/prisma.service";
import type { ConnectorService } from "../services/connector.service";

export interface StreamDeepAgentParams {
	userQuery: string;
	userId: string;
	searchSpaceId: number;
	selectedConnectors: string[];
	language?: string;
	chatId?: number;
	documentIdsToAddInContext?: number[];
}

export interface DeepAgentStreamResult {
	stream: AsyncIterable<unknown>;
	chatId?: number;
	chatWasCreated: boolean;
}

export interface ToolDependencies {
	searchSpaceId: number;
	userId: string;
	connectorService: ConnectorService;
	prisma: PrismaService;
	defaultConnectors?: string[];
	documentIdsToAddInContext?: number[];
}

export interface ToolDefinition {
	name: string;
	description: string;
	factory: (deps: ToolDependencies) => BaseTool;
	requires?: Array<keyof ToolDependencies>;
	enabledByDefault?: boolean;
}
