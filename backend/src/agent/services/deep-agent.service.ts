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

		const userQueryText = typeof params.userQuery === "string"
			? params.userQuery
			: extractTextFromMultimodal(params.userQuery);

		if (!currentChatId) {
			const chatTitleSummary = userQueryText.substring(0, 50);
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

		let humanMessageContent: string | Array<Record<string, unknown>> = params.userQuery;

		this.logger.log(`[IMG_DEBUG][deepAgent] humanMessageContent type: ${typeof humanMessageContent}, isArray: ${Array.isArray(humanMessageContent)}`);
		if (Array.isArray(humanMessageContent)) {
			this.logger.log(`[IMG_DEBUG][deepAgent] content parts: ${JSON.stringify(humanMessageContent.map((p) => ({ type: p.type, hasImageUrl: !!(p as any).image_url, imageUrlType: typeof (p as any).image_url, hasUrl: !!((p as any).image_url?.url), urlLen: ((p as any).image_url?.url || "").length })))}`);
		}

		// Pre-analyze uploaded images so the LLM gets descriptions without
		// needing to extract long data URLs and pass them to analyze_image.
		if (Array.isArray(humanMessageContent)) {
			const imageBlocks = humanMessageContent.filter(
				(b) =>
					b.type === "image_url" &&
					typeof b.image_url === "object" &&
					b.image_url !== null &&
					typeof (b.image_url as Record<string, unknown>).url === "string",
			);

			this.logger.log(`[IMG_DEBUG][deepAgent] Found ${imageBlocks.length} image_url blocks`);
			if (imageBlocks.length > 0) {
				this.logger.log(`[IMG_DEBUG][deepAgent] imageAnalysisService available: ${!!this.imageAnalysisService}`);
			}

			if (imageBlocks.length > 0 && this.imageAnalysisService) {
				const imageDescriptions: string[] = [];
				for (let i = 0; i < imageBlocks.length; i++) {
					const block = imageBlocks[i] as Record<string, unknown>;
					const imageUrl = (block.image_url as Record<string, unknown>).url as string;
					try {
						const results = await this.imageAnalysisService.describeImages([
							{ url: imageUrl },
						]);
						if (results.length > 0 && results[0].description) {
							imageDescriptions.push(
								`[Uploaded Image ${i + 1}]: ${results[0].description}`,
							);
						}
					} catch (error) {
						const msg = error instanceof Error ? error.message : "Unknown error";
						this.logger.warn(
							`Failed to pre-analyze uploaded image ${i + 1}: ${msg}`,
						);
					}
				}

				if (imageDescriptions.length > 0) {
					const imageContext = `<uploaded_images>\nThe user has uploaded ${imageDescriptions.length} image(s). Here are the AI-generated descriptions:\n\n${imageDescriptions.join("\n\n")}\n\nUse these descriptions as context. You may still call analyze_image if you need more detail about a specific image (pass the original data:image URL).\n</uploaded_images>`;

					const textBlock = humanMessageContent.find(
						(b) => b.type === "text" && typeof (b as Record<string, unknown>).text === "string",
					);
					if (textBlock) {
						(textBlock as { text: string }).text = `${imageContext}\n\n${(textBlock as { text: string }).text}`;
					} else {
						humanMessageContent = [
							{ type: "text", text: `${imageContext}\n\n${userQueryText}` },
							...humanMessageContent.filter((b) => b.type !== "text"),
						];
					}

					this.logger.log(
						`Pre-analyzed ${imageDescriptions.length} uploaded image(s)`,
					);
				}
			}
		}

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
				if (typeof humanMessageContent === "string") {
					humanMessageContent = `${documentContext}\n\n<user_query>${humanMessageContent}</user_query>`;
				} else {
					const textBlock = humanMessageContent.find(
						(b) => b.type === "text" && typeof (b as Record<string, unknown>).text === "string",
					);
					if (textBlock) {
						(textBlock as { text: string }).text = `${documentContext}\n\n<user_query>${(textBlock as { text: string }).text}</user_query>`;
					} else {
						humanMessageContent = [
							{ type: "text", text: `${documentContext}\n\n<user_query>${userQueryText}</user_query>` },
							...humanMessageContent.filter((b) => b.type !== "text"),
						];
					}
				}
				this.logger.log(
					`Injected ${selectedDocs.length} selected documents into context`,
				);
			}
		}

		const inputState = {
			messages: [new HumanMessage({ content: humanMessageContent })] as BaseMessage[],
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

function extractTextFromMultimodal(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";

	return content
		.filter(
			(block): block is { type: "text"; text: string } =>
				typeof block === "object" &&
				block !== null &&
				"type" in block &&
				block.type === "text" &&
				"text" in block &&
				typeof block.text === "string",
		)
		.map((block) => block.text)
		.join(" ");
}
