import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
	forwardRef,
	Inject,
	Injectable,
	Logger,
	Optional,
} from "@nestjs/common";
import { ChatType } from "@prisma/client";
import { createDeepAgent } from "deepagents";
import { ChatsService } from "src/chats/chats.service";
import { DocumentsService } from "src/documents/documents.service";
import { PrismaService } from "src/prisma/prisma.service";
import { QueueService } from "src/queue/queue.service";
import { ImageAnalysisService } from "src/services/image-analysis.service";
import { SseService } from "src/sse/sse.service";
import { CheckpointerService } from "../checkpointer/checkpointer.service";
import { buildSystemPrompt } from "../prompts/system-prompt";
import { buildTools } from "../tools/registry";
import type {
	DeepAgentStreamResult,
	StreamDeepAgentParams,
	ToolDependencies,
} from "../types/agent-types";
import { ThinkingStepCallbackHandler } from "../utils/custom-event-handler";
import { ConnectorService } from "./connector.service";
import { ConversationMemoryService } from "./conversation-memory.service";

interface SelectedDocument {
	id: number;
	title: string;
	documentType: string;
	documentMetadata: Record<string, unknown> | null;
	chunks: Array<{ id: number; content: string }>;
}

function escapeXml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function formatSelectedDocumentsAsContext(
	documents: SelectedDocument[],
): string {
	if (!documents.length) {
		return "";
	}

	const contextParts: string[] = ["<mentioned_documents>"];
	contextParts.push(
		"The user has explicitly selected the following documents from their knowledge base. " +
			"These documents are directly relevant to the query and should be prioritized as primary sources. " +
			"Use [citation:CHUNK_ID] format for citations (e.g., [citation:123]).",
	);
	contextParts.push("");

	for (const doc of documents) {
		const metadata = doc.documentMetadata || {};
		const metadataJson = JSON.stringify(metadata);
		const url = (metadata.url as string) || (metadata.source as string) || "";

		contextParts.push("<document>");
		contextParts.push("<document_metadata>");
		contextParts.push(`  <document_id>${doc.id}</document_id>`);
		contextParts.push(
			`  <document_type>${escapeXml(doc.documentType)}</document_type>`,
		);
		contextParts.push(`  <title><![CDATA[${doc.title}]]></title>`);
		contextParts.push(`  <url><![CDATA[${url}]]></url>`);
		contextParts.push(
			`  <metadata_json><![CDATA[${metadataJson}]]></metadata_json>`,
		);
		contextParts.push("</document_metadata>");
		contextParts.push("");
		contextParts.push("<document_content>");

		if (doc.chunks && doc.chunks.length > 0) {
			for (const chunk of doc.chunks) {
				contextParts.push(
					`  <chunk id='${chunk.id}'><![CDATA[${chunk.content}]]></chunk>`,
				);
			}
		}

		contextParts.push("</document_content>");
		contextParts.push("</document>");
		contextParts.push("");
	}

	contextParts.push("</mentioned_documents>");
	return contextParts.join("\n");
}

@Injectable()
export class DeepAgentService {
	private readonly logger = new Logger(DeepAgentService.name);

	constructor(
		private readonly connectorService: ConnectorService,
		private readonly chatsService: ChatsService,
		private readonly conversationMemoryService: ConversationMemoryService,
		private readonly prisma: PrismaService,
		private readonly checkpointerService: CheckpointerService,
		@Optional()
		@Inject(forwardRef(() => QueueService))
		private readonly queueService: QueueService,
		@Optional()
		@Inject(forwardRef(() => DocumentsService))
		private readonly documentsService: DocumentsService,
		@Optional()
		@Inject(forwardRef(() => ImageAnalysisService))
		private readonly imageAnalysisService: ImageAnalysisService,
		@Optional()
		@Inject(forwardRef(() => SseService))
		private readonly sseService: SseService,
	) {}

	private createAgent(
		dependencies: ToolDependencies,
		language?: string,
		checkpointer?: BaseCheckpointSaver,
	) {
		const llm = new ChatOpenAI({
			modelName: "gpt-5.2",
			temperature: 0.4,
			streaming: true,
		});

		const tools = buildTools(dependencies);
		const systemPrompt = buildSystemPrompt(language);

		return createDeepAgent({
			model: llm,
			tools: tools,
			systemPrompt: systemPrompt,
			checkpointer: checkpointer,
		});
	}

	async streamDeepAgent(
		params: StreamDeepAgentParams,
	): Promise<DeepAgentStreamResult> {
		let currentChatId = params.chatId;
		let chatWasCreated = false;

		if (!currentChatId) {
			const chatTitleSummary = params.userQuery.substring(0, 50);
			const newChat = await this.chatsService.create(
				{
					type: ChatType.QNA,
					title: chatTitleSummary,
					initial_connectors: params.selectedConnectors,
					messages: [],
					search_space_id: params.searchSpaceId,
				},
				params.userId,
			);
			currentChatId = newChat.id;
			chatWasCreated = true;
		}

		const dependencies: ToolDependencies = {
			searchSpaceId: params.searchSpaceId,
			userId: params.userId,
			connectorService: this.connectorService,
			prisma: this.prisma,
			defaultConnectors: params.selectedConnectors,
			documentIdsToAddInContext: params.documentIdsToAddInContext,
			queueService: this.queueService,
			documentsService: this.documentsService,
			imageAnalysisService: this.imageAnalysisService,
			sseService: this.sseService,
		};

		const checkpointer = this.checkpointerService.isReady()
			? this.checkpointerService.getCheckpointer()
			: undefined;

		const graph = this.createAgent(dependencies, params.language, checkpointer);
		this.logger.log(
			`Starting deep agent stream for search space ${params.searchSpaceId}`,
		);

		const streamConfig: RunnableConfig = {
			configurable: checkpointer ? { thread_id: String(currentChatId) } : {},
		};

		let finalQuery = params.userQuery;

		if (
			params.documentIdsToAddInContext &&
			params.documentIdsToAddInContext.length > 0
		) {
			const documents = await this.prisma.document.findMany({
				where: {
					id: { in: params.documentIdsToAddInContext },
					searchSpaceId: params.searchSpaceId,
					searchSpace: { userId: params.userId },
				},
				include: {
					chunks: {
						orderBy: { id: "asc" },
						take: 30,
					},
				},
			});

			const selectedDocs: SelectedDocument[] = documents.map((doc) => ({
				id: doc.id,
				title: doc.title,
				documentType: doc.documentType,
				documentMetadata:
					(doc.documentMetadata as Record<string, unknown>) || {},
				chunks: doc.chunks.map((chunk) => ({
					id: chunk.id,
					content: chunk.content,
				})),
			}));

			if (selectedDocs.length > 0) {
				const documentContext = formatSelectedDocumentsAsContext(selectedDocs);
				finalQuery = `${documentContext}\n\n<user_query>${params.userQuery}</user_query>`;
				this.logger.log(
					`Injected ${selectedDocs.length} selected documents into context`,
				);
			}
		}

		const inputState = {
			messages: [new HumanMessage(finalQuery)] as BaseMessage[],
		};

		const stream = await graph.stream(inputState, {
			...streamConfig,
			encoding: "text/event-stream",
			streamMode: ["messages", "custom"],
			callbacks: [new ThinkingStepCallbackHandler()],
		});

		return {
			stream,
			chatId: currentChatId,
			chatWasCreated,
		};
	}
}
