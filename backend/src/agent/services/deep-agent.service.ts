import { createHash } from "node:crypto";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
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
import { UploadService } from "src/upload/upload.service";
import { CheckpointerService } from "../checkpointer/checkpointer.service";
import { buildSystemPrompt } from "../prompts/system-prompt";
import { buildTools } from "../tools/registry";
import type {
	DeepAgentStreamResult,
	StreamDeepAgentParams,
	ToolDependencies,
	UploadedDocumentInfo,
} from "../types/agent-types";
import { ThinkingStepCallbackHandler } from "../utils/custom-event-handler";
import { ConnectorService } from "./connector.service";
import { ConversationMemoryService } from "./conversation-memory.service";
import { LLMService } from "./llm.service";

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
		@Optional()
		@Inject(forwardRef(() => UploadService))
		private readonly uploadService: UploadService,
		private readonly llmService: LLMService,
	) {}

	private createAgent(
		dependencies: ToolDependencies,
		language: string | undefined,
		llm: BaseChatModel,
		checkpointer: BaseCheckpointSaver | undefined,
	) {
		const tools = buildTools(dependencies);
		const systemPrompt = buildSystemPrompt(language);

		return createDeepAgent({
			model: llm,
			tools: tools,
			systemPrompt: systemPrompt,
			checkpointer: checkpointer,
		});
	}

	/**
	 * Resolve the LLM the deep agent should run on. Prefers the user's
	 * configured `fast` LLM so that model + API key + temperature match
	 * the user's LLM Config. Falls back to a platform default that
	 * relies on the `OPENAI_API_KEY` env var if the user has no config.
	 */
	private async resolveAgentLLM(
		userId: string,
		searchSpaceId: number,
	): Promise<{ llm: BaseChatModel; usedUserConfig: boolean }> {
		const userLlm = await this.llmService.getUserFastLLM(userId, searchSpaceId);
		if (userLlm) {
			this.logger.log(
				`Deep agent using user-configured fast LLM: ${this.llmService.getModelName(userLlm)}`,
			);
			return { llm: userLlm, usedUserConfig: true };
		}
		this.logger.warn(
			`No user-configured fast LLM for user ${userId} in search space ${searchSpaceId}; ` +
				`falling back to platform default gpt-4.1-mini (env OPENAI_API_KEY).`,
		);
		return {
			llm: new ChatOpenAI({
				modelName: "gpt-4.1-mini",
				streaming: true,
				temperature: 0.4,
			}),
			usedUserConfig: false,
		};
	}

	async streamDeepAgent(
		params: StreamDeepAgentParams,
	): Promise<DeepAgentStreamResult> {
		let currentChatId = params.chatId;
		let chatWasCreated = false;

		const userQueryText =
			typeof params.userQuery === "string"
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

		const uploadedImageUrls = new Map<string, string>();
		const uploadedDocuments: UploadedDocumentInfo[] = [];

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
			uploadedImageUrls,
			uploadedDocuments,
			uploadService: this.uploadService,
		};

		const checkpointer = this.checkpointerService.isReady()
			? this.checkpointerService.getCheckpointer()
			: undefined;

		const { llm, usedUserConfig } = await this.resolveAgentLLM(
			params.userId,
			params.searchSpaceId,
		);
		const graph = this.createAgent(
			dependencies,
			params.language,
			llm,
			checkpointer,
		);
		this.logger.log(
			`Starting deep agent stream for search space ${params.searchSpaceId}`,
		);

		const streamConfig: RunnableConfig = {
			configurable: checkpointer ? { thread_id: String(currentChatId) } : {},
		};

		let humanMessageContent: string | Array<Record<string, unknown>> =
			params.userQuery;

		if (Array.isArray(humanMessageContent)) {
			const imageBlocks = humanMessageContent.filter(
				(b) =>
					b.type === "image_url" &&
					typeof b.image_url === "object" &&
					b.image_url !== null &&
					typeof (b.image_url as Record<string, unknown>).url === "string",
			);

			if (imageBlocks.length > 0 && this.imageAnalysisService) {
				const imageDescriptions: string[] = [];
				for (let i = 0; i < imageBlocks.length; i++) {
					const block = imageBlocks[i] as Record<string, unknown>;
					const imageUrl = (block.image_url as Record<string, unknown>)
						.url as string;
					const refId = `uploaded://${i + 1}`;
					uploadedImageUrls.set(refId, imageUrl);

					// Upload to S3 so we have a persistent HTTP URL the LLM can
					// reference across messages (data:image URLs only exist in
					// the current request's HumanMessage).
					let s3Url: string | undefined;
					try {
						s3Url = await this.uploadImageToS3(imageUrl);
					} catch {
						// Non-fatal: uploaded:// fallback still works for this request
					}
					if (s3Url) {
						uploadedImageUrls.set(s3Url, imageUrl);
					}

					try {
						const results = await this.imageAnalysisService.describeImages([
							{ url: imageUrl },
						]);
						if (results.length > 0 && results[0].description) {
							const ref = s3Url || refId;
							imageDescriptions.push(
								`[Uploaded Image ${i + 1} (URL: ${ref})]: ${results[0].description}`,
							);
						}
					} catch (error) {
						const msg =
							error instanceof Error ? error.message : "Unknown error";
						this.logger.warn(
							`Failed to pre-analyze uploaded image ${i + 1}: ${msg}`,
						);
					}
				}

				if (imageDescriptions.length > 0) {
					const imageContext = `<uploaded_images>\nThe user has uploaded ${imageDescriptions.length} image(s). Pre-generated AI descriptions for reference:\n\n${imageDescriptions.join("\n\n")}\n\nIf the user explicitly asks about an uploaded image, you MUST call analyze_image with the image URL shown above (e.g. imageUrl="https://..." if an HTTP URL is listed, or imageUrl="uploaded://N" as fallback). Do NOT just paraphrase these descriptions as your answer.\n</uploaded_images>`;

					const textBlock = humanMessageContent.find(
						(b) =>
							b.type === "text" &&
							typeof (b as Record<string, unknown>).text === "string",
					);
					if (textBlock) {
						(textBlock as { text: string }).text =
							`${imageContext}\n\n${(textBlock as { text: string }).text}`;
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

				// Remove image_url blocks from the message content sent to OpenAI.
				// Image analysis is handled by the analyze_image tool (Gemini API),
				// not by GPT vision. The <uploaded_images> XML context above gives
				// the agent enough info to decide when to call analyze_image.
				humanMessageContent = (
					Array.isArray(humanMessageContent)
						? humanMessageContent.filter((b) => b.type !== "image_url")
						: humanMessageContent
				) as string | Array<Record<string, unknown>>;
			}
		}

		const documentMarkerRegex = /\[uploaded_document:\s*(\{.*?\})\]/g;
		const allTextBlocks = Array.isArray(humanMessageContent)
			? humanMessageContent.filter(
					(b) =>
						b.type === "text" &&
						typeof (b as Record<string, unknown>).text === "string",
				)
			: [];

		if (allTextBlocks.length > 0) {
			const docEntries: UploadedDocumentInfo[] = [];
			for (const block of allTextBlocks) {
				const text = (block as Record<string, unknown>).text as string;
				let match: RegExpExecArray | null;
				// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
				while ((match = documentMarkerRegex.exec(text)) !== null) {
					try {
						const parsed = JSON.parse(match[1]);
						if (parsed.filePath && parsed.fileName) {
							docEntries.push({
								filePath: parsed.filePath,
								fileName: parsed.fileName,
							});
						}
					} catch {
						this.logger.warn(
							`Failed to parse uploaded_document metadata: ${match[1]}`,
						);
					}
				}
			}

			if (docEntries.length > 0) {
				uploadedDocuments.push(...docEntries);

				for (const block of allTextBlocks) {
					const textBlock = block as { text: string };
					textBlock.text = textBlock.text
						.replace(documentMarkerRegex, "")
						.trim();
				}

				const docContext = `<uploaded_documents>\nThe user has uploaded ${docEntries.length} document(s):\n\n${docEntries.map((d, i) => `[Document ${i + 1}: "${d.fileName}" (filePath: "${d.filePath}")]`).join("\n")}\n\nIf the user wants to index/add these documents to their knowledge base, call index_document with the filePath and fileName shown above.\n</uploaded_documents>`;

				const firstTextBlock = allTextBlocks[0] as { text: string };
				if (firstTextBlock) {
					firstTextBlock.text = `${docContext}\n\n${firstTextBlock.text}`;
				}

				this.logger.log(`Detected ${docEntries.length} uploaded document(s)`);
			}
		}

		if (params.documentIdsToAddInContext.length > 0) {
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
						(b) =>
							b.type === "text" &&
							typeof (b as Record<string, unknown>).text === "string",
					);
					if (textBlock) {
						(textBlock as { text: string }).text =
							`${documentContext}\n\n<user_query>${(textBlock as { text: string }).text}</user_query>`;
					} else {
						humanMessageContent = [
							{
								type: "text",
								text: `${documentContext}\n\n<user_query>${userQueryText}</user_query>`,
							},
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
			messages: [
				new HumanMessage({ content: humanMessageContent }),
			] as BaseMessage[],
		};

		const stream = await graph.stream(inputState, {
			...streamConfig,
			encoding: "text/event-stream",
			streamMode: ["messages", "custom"],
			callbacks: params.creditHandler
				? [new ThinkingStepCallbackHandler(), params.creditHandler]
				: [new ThinkingStepCallbackHandler()],
		});

		return {
			stream,
			chatId: currentChatId,
			chatWasCreated,
			billedToUserKey: usedUserConfig,
		};
	}

	private async uploadImageToS3(imageUrl: string): Promise<string | undefined> {
		if (!this.uploadService) return undefined;

		let buffer: Buffer;
		let mimeType: string;

		if (imageUrl.startsWith("data:image/")) {
			const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
			if (!match) return undefined;
			mimeType = match[1];
			buffer = Buffer.from(match[2], "base64");
		} else {
			return undefined;
		}

		const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
		const ext = mimeType.split("/")[1] || "png";
		const result = await this.uploadService.upload(
			buffer,
			`${hash}.${ext}`,
			"chat-images",
			mimeType,
		);
		return result.url;
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
