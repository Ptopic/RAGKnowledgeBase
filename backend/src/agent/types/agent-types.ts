import type { BaseTool } from "@langchain/core/tools";
import type { DocumentsService } from "src/documents/documents.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { QueueService } from "src/queue/queue.service";
import type { ImageAnalysisService } from "src/services/image-analysis.service";
import type { SseService } from "src/sse/sse.service";
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
	stream: AsyncIterable<string>;
	chatId: number;
	chatWasCreated: boolean;
}

export interface ToolDependencies {
	searchSpaceId: number;
	userId: string;
	connectorService: ConnectorService;
	prisma: PrismaService;
	defaultConnectors?: string[];
	documentIdsToAddInContext?: number[];
	queueService?: QueueService;
	documentsService?: DocumentsService;
	imageAnalysisService?: ImageAnalysisService;
	sseService?: SseService;
}

export interface ToolDefinition {
	name: string;
	description: string;
	factory: (deps: ToolDependencies) => BaseTool;
	requires?: Array<keyof ToolDependencies>;
	enabledByDefault?: boolean;
}
