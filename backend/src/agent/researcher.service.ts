import {
	AIMessage,
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { ChatOpenAI } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ResearcherDto, SearchMode } from "./dtos/researcher.dto";
import { ConnectorService } from "./services/connector.service";
import { LLMService } from "./services/llm.service";
import { PromptsService } from "./services/prompts.service";
import { QNAService } from "./services/qna.service";
import { StreamingService } from "./streaming.service";
import { Document, getConnectorFriendlyName } from "./utils/agent.utils";

interface ChatMessage {
	role: string;
	content: string;
}

/**
 * Researcher Service Implementation
 * Full-featured research agent with query reformulation, document retrieval, and Q&A
 */
@Injectable()
export class ResearcherService {
	private readonly logger = new Logger(ResearcherService.name);

	constructor(
		private prisma: PrismaService,
		private connectorService: ConnectorService,
		private qnaService: QNAService,
		private llmService: LLMService,
		private promptsService: PromptsService,
	) {}

	/**
	 * Main researcher agent workflow using LangGraph streaming
	 * Workflow: reformulate_query -> fetch_documents -> qna_workflow -> generate_follow_up_questions
	 */
	async streamResearcher(researcherDto: ResearcherDto): Promise<any> {
		try {
			const {
				user_query,
				connectors_to_search,
				user_id,
				search_space_id,
				search_mode,
				document_ids_to_add_in_context = [],
				language,
				chat_history = [],
				thread_id,
			} = researcherDto;

			this.logger.log(
				`Researcher starting with connectors: ${JSON.stringify(connectors_to_search)}`,
			);
			this.logger.log(
				`Document IDs to add: ${JSON.stringify(document_ids_to_add_in_context)}`,
			);

			// Convert chat history to BaseMessage format
			const chatHistoryMessages: BaseMessage[] = chat_history.map((msg) => {
				if (msg.role === "user") {
					return new HumanMessage(msg.content);
				} else {
					return new SystemMessage(msg.content);
				}
			});

			// Get user's LLM instance
			const userLlm = await this.llmService.getUserFastLLM(
				user_id,
				search_space_id,
			);
			const modelName = userLlm
				? this.llmService.getModelName(userLlm)
				: "gpt-4o-mini";

			// Create streaming LLM
			const streamingLlm = new ChatOpenAI({
				modelName: modelName as string,
				temperature: 1.0,
				streaming: true,
			});

			// TODO: Add your tool calls here
			// Example tools that you'll implement:
			// - reformulateQueryTool
			// - fetchDocumentsTool
			// - qnaWorkflowTool
			// - generateFollowUpQuestionsTool
			const tools: any[] = [];

			// Create the streaming agent
			// Define the agent state graph
			const toolNode = new ToolNode(tools);

			const model = streamingLlm.bindTools(tools);

			// Define the function that calls the model
			const callModel = async (state: typeof MessagesAnnotation.State) => {
				const { messages } = state;
				const response = await model.invoke(messages);
				return { messages: [response] };
			};

			// Define the function that determines whether to continue or not
			const shouldContinue = (state: typeof MessagesAnnotation.State) => {
				const { messages } = state;
				const lastMessage = messages[messages.length - 1] as AIMessage;
				// If there is no function call, then we finish
				if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
					return "__end__";
				}
				// Otherwise if there is, we continue
				return "tools";
			};

			// Define and compile the graph
			const workflow = new StateGraph(MessagesAnnotation)
				.addNode("agent", callModel)
				.addNode("tools", toolNode)
				.addEdge("__start__", "agent")
				.addConditionalEdges("agent", shouldContinue)
				.addEdge("tools", "agent");

			const streamingAgent = workflow.compile({
				// TODO: Add checkpointer if you want persistent state
				// checkpointer: yourCheckpointSaver,
			});

			// Build messages array
			const messagesToSend: BaseMessage[] = [
				new SystemMessage(
					`You are a research assistant. Your task is to:
1. Reformulate the user's query based on chat history if needed
2. Fetch relevant documents from the selected connectors
3. Generate a comprehensive answer using the QNA workflow
4. Provide contextual follow-up questions

User query: ${user_query}
Selected connectors: ${connectors_to_search.join(", ")}
Search mode: ${search_mode}
Language: ${language || "English"}`,
				),
			];

			// Add chat history
			messagesToSend.push(...chatHistoryMessages);

			// Add current user message
			messagesToSend.push(new HumanMessage(user_query));

			// Use persistent thread_id for checkpoint state
			const persistentThreadId =
				thread_id || `research-${user_id}-${search_space_id}`;

			this.logger.log(
				`Using thread_id: ${persistentThreadId} for researcher agent`,
			);

			// Use LangGraph's streaming API
			const stream = await streamingAgent.stream(
				{
					messages: [...messagesToSend],
				},
				{
					streamMode: ["messages", "custom"],
					configurable: { thread_id: persistentThreadId },
					// TODO: Add callbacks if needed
					// callbacks: [langsmithHandler, customEventHandler],
				},
			);

			this.logger.log(`Researcher stream created successfully`);
			return stream;
		} catch (error) {
			this.logger.error(`Researcher error: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Reformulate query based on chat history
	 */
	private async reformulateQuery(
		query: string,
		chatHistory: BaseMessage[],
		userId: string,
		searchSpaceId: number,
	): Promise<string> {
		if (chatHistory.length === 0) {
			return query;
		}

		try {
			const llm = await this.llmService.getUserFastLLM(userId, searchSpaceId);
			if (!llm) {
				this.logger.warn("No LLM available for query reformulation");
				return query;
			}

			const historyStr = chatHistory
				.map((msg) => {
					const msgType = (msg as any)._getType?.();
					if (msgType === "human") return `<user>${msg.content}</user>`;
					if (msgType === "ai") return `<assistant>${msg.content}</assistant>`;
					return "";
				})
				.filter((s) => s)
				.join("\n");

			const systemPrompt =
				this.promptsService.getQueryReformulationSystemPrompt();

			const reformulationPrompt = `
Chat History:
${historyStr}

Current Query: ${query}

Reformulated Query (respond with only the reformulated query, nothing else):`;

			const today = new Date().toISOString().split("T")[0];
			const dateSystem = new SystemMessage(
				`RUNTIME NOTE (server): The current date is ${today}.
Use this value as the authoritative current date for any questions about date or time. When asked for the current date, reply with this value.`,
			);

			const response = await llm.invoke([
				dateSystem,
				new SystemMessage(systemPrompt),
				new HumanMessage(reformulationPrompt),
			]);

			return String(response.content).trim();
		} catch (error) {
			this.logger.error(
				`Error reformulating query: ${error.message}`,
				error.stack,
			);
			return query;
		}
	}

	/**
	 * Fetch documents by IDs (user-selected)
	 */
	private async fetchDocumentsByIds(
		documentIds: number[],
		userId: string,
		searchSpaceId: number,
	): Promise<{ documents: Document[]; sources: any[] }> {
		if (!documentIds || documentIds.length === 0) {
			return { documents: [], sources: [] };
		}

		try {
			// Fetch documents with ownership check
			const documents = await this.prisma.document.findMany({
				where: {
					id: { in: documentIds },
					searchSpaceId,
					searchSpace: { userId },
				},
				include: {
					chunks: {
						orderBy: { id: "asc" },
					},
				},
			});

			// Format documents as chunks
			const formattedDocuments: Document[] = [];
			const documentsByType: Record<string, any[]> = {};

			for (const doc of documents) {
				const docType = doc.documentType;

				if (!documentsByType[docType]) {
					documentsByType[docType] = [];
				}
				documentsByType[docType].push(doc);

				// Add each chunk as a separate document
				for (const chunk of doc.chunks) {
					formattedDocuments.push({
						chunk_id: chunk.id,
						content: chunk.content,
						score: 0.5, // High score for user-selected
						document: {
							id: doc.id,
							title: doc.title,
							document_type: docType,
							metadata: (doc.documentMetadata as Record<string, any>) || {},
						},
						source: docType,
					});
				}
			}

			// Create source objects with rich formatting
			const sources = Object.entries(documentsByType).map(([docType, docs]) => {
				// Format each document using the connector service's rich formatting
				const sourcesList = docs.flatMap((doc) => {
					// Get chunks for this document and format them
					const docChunks = formattedDocuments.filter(
						(chunk) => chunk.document.id === doc.id,
					);

					return docChunks.map((chunk) => {
						// Use connector service's rich formatting
						return this.connectorService.formatSourceEntryPublic(
							docType,
							chunk,
						);
					});
				});

				const docCount = docs.length;
				const chunkCount = sourcesList.length;

				return {
					id: 100 + docCount,
					name: `${getConnectorFriendlyName(docType)} (User-Selected: ${docCount} ${docCount === 1 ? "document" : "documents"}, ${chunkCount} ${chunkCount === 1 ? "chunk" : "chunks"})`,
					type: `USER_SELECTED_${docType}`,
					sources: sourcesList,
				};
			});

			this.logger.log(
				`Fetched ${formattedDocuments.length} user-selected chunks from ${documentIds.length} documents`,
			);

			return { documents: formattedDocuments, sources };
		} catch (error) {
			this.logger.error(
				`Error fetching documents by IDs: ${error.message}`,
				error.stack,
			);
			return { documents: [], sources: [] };
		}
	}

	/**
	 * Fetch relevant documents from connectors
	 */
	private async fetchRelevantDocuments(
		researchQuestions: string[],
		userId: string,
		searchSpaceId: number,
		connectorsToSearch: string[],
		topK: number,
		searchMode: SearchMode,
		subscriber: any,
		streamingService: StreamingService,
		userSelectedSources: any[] = [],
	): Promise<{ relevantDocuments: Document[]; allSources: any[] }> {
		// Handle case when no connectors are selected
		if (!connectorsToSearch || connectorsToSearch.length === 0) {
			subscriber.next(
				streamingService.formatTerminalInfoDelta(
					"📹 No data sources selected. Research will be generated using general knowledge and any user-selected documents.",
				),
			);
			return { relevantDocuments: [], allSources: userSelectedSources };
		}

		const allRawDocuments: Document[] = [];
		const allSources: any[] = [...userSelectedSources];

		// Process each research question
		for (let i = 0; i < researchQuestions.length; i++) {
			const userQuery = researchQuestions[i];

			// Process each connector
			for (const connector of connectorsToSearch) {
				try {
					let result: any;

					// Call appropriate connector search method
					switch (connector) {
						case "YOUTUBE_VIDEO":
							result = await this.connectorService.searchYouTube(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						case "CRAWLED_URL":
							result = await this.connectorService.searchCrawledUrls(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						case "FILE":
							result = await this.connectorService.searchFiles(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						case "SLACK_CONNECTOR":
							result = await this.connectorService.searchSlack(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						case "NOTION_CONNECTOR":
							result = await this.connectorService.searchNotion(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						case "GITHUB_CONNECTOR":
							result = await this.connectorService.searchGitHub(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						case "GOOGLE_CALENDAR_CONNECTOR":
							result = await this.connectorService.searchGoogleCalendar(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						case "GOOGLE_GMAIL_CONNECTOR":
							result = await this.connectorService.searchGoogleGmail(
								userQuery,
								userId,
								searchSpaceId,
								topK,
								searchMode,
							);
							break;

						default:
							this.logger.warn(`Unsupported connector: ${connector}`);
							continue;
					}

					if (result) {
						if (result.sourceObject) {
							allSources.push(result.sourceObject);
						}
						allRawDocuments.push(...result.chunks);
					}
				} catch (error) {}
			}
		}

		// Deduplicate documents
		const seenChunkIds = new Set<string | number>();
		const seenContentHashes = new Set<number>();
		const deduplicatedDocs: Document[] = [];

		for (const doc of allRawDocuments) {
			const chunkId = doc.chunk_id;
			const content = doc.content || "";
			const contentHash = this.simpleHash(content);

			// Skip duplicates
			if (
				(chunkId && seenChunkIds.has(chunkId)) ||
				seenContentHashes.has(contentHash)
			) {
				continue;
			}

			if (chunkId) seenChunkIds.add(chunkId);
			seenContentHashes.add(contentHash);
			deduplicatedDocs.push(doc);
		}

		return { relevantDocuments: deduplicatedDocs, allSources };
	}

	/**
	 * Robust hash function for content deduplication
	 * Uses a combination of simple hash and content-based fingerprinting
	 * to minimize collision probability
	 */
	private simpleHash(str: string): number {
		if (!str) return 0;

		// Use FNV-1a hash algorithm (better distribution than simple hash)
		let hash = 2166136261; // FNV offset basis

		for (let i = 0; i < str.length; i++) {
			hash ^= str.charCodeAt(i);
			// FNV prime: 16777619
			hash +=
				(hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
		}

		// Convert to 32-bit integer
		return hash >>> 0;
	}

	/**
	 * Extract sources from documents for streaming
	 */
	private extractSourcesFromDocuments(documents: Document[]): any[] {
		const documentsByType: Record<string, Document[]> = {};

		for (const doc of documents) {
			const sourceType = doc.source || "UNKNOWN";
			const documentType = doc.document?.document_type || sourceType;
			const groupType = documentType !== "UNKNOWN" ? documentType : sourceType;

			if (!documentsByType[groupType]) {
				documentsByType[groupType] = [];
			}
			documentsByType[groupType].push(doc);
		}

		const sourceObjects: any[] = [];
		let sourceIdCounter = 1;

		for (const [docType, docs] of Object.entries(documentsByType)) {
			const sourcesList = docs.map((doc) => {
				const documentInfo = doc.document || ({} as any);
				const metadata = documentInfo.metadata || {};

				return {
					id: doc.chunk_id || sourceIdCounter++,
					title: documentInfo.title || "Untitled Document",
					description: (doc.content || "").trim().substring(0, 200),
					url: metadata.url || metadata.page_url || "",
				};
			});

			const groupName = getConnectorFriendlyName(docType);

			sourceObjects.push({
				id: sourceObjects.length + 1,
				name: groupName,
				type: docType,
				sources: sourcesList,
			});
		}

		return sourceObjects;
	}

	/**
	 * Generate follow-up questions
	 */
	private async generateFollowUpQuestions(
		userQuery: string,
		chatHistory: BaseMessage[],
		rerankedDocuments: Document[],
		userId: string,
		searchSpaceId: number,
		subscriber: any,
		streamingService: StreamingService,
	): Promise<Array<{ id: number; question: string }>> {
		try {
			const llm = await this.llmService.getUserFastLLM(userId, searchSpaceId);
			if (!llm) {
				this.logger.error("No fast LLM configured");
				subscriber.next(streamingService.formatError("No fast LLM configured"));
				return [];
			}

			// Format chat history
			const chatHistoryXml = this.formatChatHistoryXml(chatHistory);

			// Format documents
			const documentsXml = this.formatDocumentsXml(rerankedDocuments);

			const humanMessageContent = `
${chatHistoryXml}

${documentsXml}

Based on the chat history and available documents above, generate 3-5 contextually relevant follow-up questions that would naturally extend the conversation and provide additional value to the user. Make sure the questions can be reasonably answered using the available documents or knowledge base.

Your response MUST be valid JSON in exactly this format:
{
  "further_questions": [
    {"id": 0, "question": "further qn 1"},
    {"id": 1, "question": "further qn 2"}
  ]
}

Do not include any other text or explanation. Only return the JSON.
`;

			const systemPrompt =
				this.promptsService.getFurtherQuestionsSystemPrompt();

			// Include the current date explicitly so the model has an authoritative
			// timestamp independent of the system prompt content.
			const today = new Date().toISOString().split("T")[0];
			const dateSystem = new SystemMessage(
				`RUNTIME NOTE (server): The current date is ${today}.
Use this value as the authoritative current date for any questions about date or time. When asked for the current date, reply with this value.`,
			);

			const response = await llm.invoke([
				dateSystem,
				new SystemMessage(systemPrompt),
				new HumanMessage(humanMessageContent),
			]);

			const content = String(response.content);
			const jsonMatch = content.match(/\{[\s\S]*\}/);

			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				return parsed.further_questions || [];
			}

			return [];
		} catch (error) {
			this.logger.error(
				`Error generating follow-up questions: ${error.message}`,
				error.stack,
			);
			return [];
		}
	}

	/**
	 * Format chat history as XML
	 */
	private formatChatHistoryXml(chatHistory: BaseMessage[]): string {
		let xml = "<chat_history>\n";
		for (const message of chatHistory) {
			const msgType = (message as any)._getType?.();
			if (msgType === "human") {
				xml += `<user>${message.content}</user>\n`;
			} else if (msgType === "ai") {
				xml += `<assistant>${message.content}</assistant>\n`;
			}
		}
		xml += "</chat_history>";
		return xml;
	}

	/**
	 * Format documents as XML
	 */
	private formatDocumentsXml(documents: Document[]): string {
		let xml = "<documents>\n";
		for (let i = 0; i < documents.length; i++) {
			const doc = documents[i];
			const sourceId = doc.document?.id || `doc_${i}`;
			const sourceType = doc.document?.document_type || "UNKNOWN";
			const content = doc.content || "";

			xml += "<document>\n";
			xml += "<metadata>\n";
			xml += `<source_id>${sourceId}</source_id>\n`;
			xml += `<source_type>${sourceType}</source_type>\n`;
			xml += "</metadata>\n";
			xml += `<content>\n${content}</content>\n`;
			xml += "</document>\n";
		}
		xml += "</documents>";
		return xml;
	}
}
