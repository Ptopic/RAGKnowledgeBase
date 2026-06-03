import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { BaseTool } from "@langchain/core/tools";
import type { DocumentsService } from "src/documents/documents.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { QueueService } from "src/queue/queue.service";
import type { ImageAnalysisService } from "src/services/image-analysis.service";
import type { SseService } from "src/sse/sse.service";
import type { UploadService } from "src/upload/upload.service";
import type { ConnectorService } from "../services/connector.service";

type MultimodalContent =
	| string
	| Array<
			| { type: "text"; text: string }
			| { type: "image_url"; image_url: string }
			| { type: "image_url"; image_url: { url: string } }
			| Record<string, unknown>
	  >;

export interface StreamDeepAgentParams {
	userQuery: MultimodalContent;
	userId: string;
	searchSpaceId: number;
	selectedConnectors: string[];
	language?: string;
	chatId?: number;
	documentIdsToAddInContext?: number[];
	/** Optional credit-tracking callback; receives token usage from the
	 *  underlying LLM calls so the controller can deduct credits after the
	 *  stream finishes. */
	creditHandler?: BaseCallbackHandler;
}

export interface DeepAgentStreamResult {
	stream: AsyncIterable<string>;
	chatId: number;
	chatWasCreated: boolean;
}

export interface UploadedDocumentInfo {
	filePath: string;
	fileName: string;
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
	uploadedImageUrls?: Map<string, string>;
	uploadedDocuments?: UploadedDocumentInfo[];
	uploadService?: UploadService;
}

export interface ToolDefinition {
	name: string;
	description: string;
	factory: (deps: ToolDependencies) => BaseTool;
	requires?: Array<keyof ToolDependencies>;
	enabledByDefault?: boolean;
}
