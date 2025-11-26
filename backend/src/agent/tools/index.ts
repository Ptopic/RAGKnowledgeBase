import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ConnectorService } from "../services/connector.service";
import { LLMService } from "../services/llm.service";
import { PromptsService } from "../services/prompts.service";
import { QNAService } from "../services/qna.service";
import { RerankerService } from "../services/reranker.service";
import { Document } from "../utils/agent.utils";
import { SearchMode } from "../dtos/researcher.dto";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Factory function to create LangChain tools with service dependencies
 * This allows us to inject NestJS services into LangChain tools
 */
export function createAgentTools(
	connectorService: ConnectorService,
	llmService: LLMService,
	promptsService: PromptsService,
	qnaService: QNAService,
	rerankerService: RerankerService,
) {
	/**
	 * Tool: Search across all enabled connectors
	 * This tool searches all user-enabled connectors and returns relevant documents
	 */
	const searchConnectorsTool = tool(
		async ({
			query,
			userId,
			searchSpaceId,
			enabledConnectors,
			searchMode = "CHUNKS",
		}: {
			query: string;
			userId: string;
			searchSpaceId: number;
			enabledConnectors: string[];
			searchMode?: "CHUNKS" | "DOCUMENTS";
		}) => {
			const topK = searchMode === "DOCUMENTS" ? 5 : 20;
			const allRawDocuments: Document[] = [];

			// Search all enabled connectors
			for (const connector of enabledConnectors) {
				try {
					let result: any;

					switch (connector) {
						case "YOUTUBE_VIDEO":
							result = await connectorService.searchYouTube(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						case "CRAWLED_URL":
							result = await connectorService.searchCrawledUrls(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						case "FILE":
							result = await connectorService.searchFiles(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						case "SLACK_CONNECTOR":
							result = await connectorService.searchSlack(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						case "NOTION_CONNECTOR":
							result = await connectorService.searchNotion(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						case "GITHUB_CONNECTOR":
							result = await connectorService.searchGitHub(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						case "GOOGLE_CALENDAR_CONNECTOR":
							result = await connectorService.searchGoogleCalendar(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						case "GOOGLE_GMAIL_CONNECTOR":
							result = await connectorService.searchGoogleGmail(
								query,
								userId,
								searchSpaceId,
								topK,
								searchMode as SearchMode,
							);
							break;

						default:
							console.warn(`Unsupported connector: ${connector}`);
							continue;
					}

					if (result?.chunks) {
						allRawDocuments.push(...result.chunks);
					}
				} catch (error) {
					console.error(`Error searching ${connector}:`, error);
				}
			}

			// Deduplicate documents
			const seenChunkIds = new Set<string | number>();
			const deduplicatedDocs: Document[] = [];

			for (const doc of allRawDocuments) {
				const chunkId = doc.chunk_id;
				if (chunkId && !seenChunkIds.has(chunkId)) {
					seenChunkIds.add(chunkId);
					deduplicatedDocs.push(doc);
				}
			}

			return JSON.stringify({
				documentsFound: deduplicatedDocs.length,
				documents: deduplicatedDocs.slice(0, 50), // Limit to 50 for context
				message: `Found ${deduplicatedDocs.length} relevant documents across all connectors.`,
			});
		},
		{
			name: "search_connectors",
			description: `Search across all enabled data connectors (YouTube, Slack, Notion, GitHub, Files, URLs, Google Calendar, Gmail) for relevant information.

      Use this tool when:
      - User asks a question that requires searching their personal knowledge base
      - You need to find relevant documents or information from user's data sources
      - Always use this tool FIRST before attempting to answer questions

      Returns: JSON with documents array and count of documents found.`,
			schema: z.object({
				query: z.string().describe("The search query"),
				userId: z.string().describe("User ID"),
				searchSpaceId: z.number().describe("Search space ID"),
				enabledConnectors: z
					.array(z.string())
					.describe("List of enabled connectors to search"),
				searchMode: z
					.enum(["CHUNKS", "DOCUMENTS"])
					.optional()
					.describe("Search mode: CHUNKS or DOCUMENTS"),
			}),
		},
	);

	/**
	 * Tool: Reformulate query based on chat history
	 * Makes queries more specific by considering conversation context
	 */
	const reformulateQueryTool = tool(
		async ({
			query,
			chatHistory,
			userId,
			searchSpaceId,
		}: {
			query: string;
			chatHistory: { role: string; content: string }[];
			userId: string;
			searchSpaceId: number;
		}) => {
			if (!chatHistory || chatHistory.length === 0) {
				return query;
			}

			try {
				const llm = await llmService.getUserFastLLM(userId, searchSpaceId);
				if (!llm) {
					return query;
				}

				const chatHistoryMessages: BaseMessage[] = chatHistory.map((msg) =>
					msg.role === "user"
						? new HumanMessage(msg.content)
						: new SystemMessage(msg.content),
				);

				const historyStr = chatHistoryMessages
					.map((msg) => {
						const msgType = (msg as any)._getType?.();
						if (msgType === "human") return `<user>${msg.content}</user>`;
						if (msgType === "ai") return `<assistant>${msg.content}</assistant>`;
						return "";
					})
					.filter((s) => s)
					.join("\n");

				const systemPrompt =
					promptsService.getQueryReformulationSystemPrompt();

				const reformulationPrompt = `
Chat History:
${historyStr}

Current Query: ${query}

Reformulated Query (respond with only the reformulated query, nothing else):`;

				const response = await llm.invoke([
					new SystemMessage(systemPrompt),
					new HumanMessage(reformulationPrompt),
				]);

				return String(response.content).trim();
			} catch (error) {
				console.error("Error reformulating query:", error);
				return query;
			}
		},
		{
			name: "reformulate_query",
			description: `Reformulate a user's query to be more specific and contextual based on chat history.

      Use this tool when:
      - There is chat history and the user's query might be ambiguous
      - The query contains pronouns or references to previous messages
      - You want to make the query more specific for better search results

      Example: "What about Python?" → "What are the Python programming tutorials mentioned earlier?"`,
			schema: z.object({
				query: z.string().describe("Original user query"),
				chatHistory: z
					.array(
						z.object({
							role: z.string(),
							content: z.string(),
						}),
					)
					.describe("Previous conversation messages"),
				userId: z.string(),
				searchSpaceId: z.number(),
			}),
		},
	);

	/**
	 * Tool: Rerank documents by relevance
	 * Uses a reranker model to sort documents by relevance to query
	 */
	const rerankDocumentsTool = tool(
		async ({
			query,
			documents,
		}: {
			query: string;
			documents: Document[];
		}) => {
			if (!documents || documents.length === 0) {
				return JSON.stringify({ documents: [] });
			}

			try {
				const reranked = await rerankerService.rerankDocuments(query, documents);
				return JSON.stringify({
					documents: reranked,
					message: `Reranked ${reranked.length} documents by relevance.`,
				});
			} catch (error) {
				console.error("Error reranking documents:", error);
				return JSON.stringify({ documents, message: "Reranking failed, returning original order." });
			}
		},
		{
			name: "rerank_documents",
			description: `Rerank a list of documents by relevance to a query using a reranker model.

      Use this tool after searching to improve document ordering.
      The reranker will score each document and return them sorted by relevance.`,
			schema: z.object({
				query: z.string().describe("Search query"),
				documents: z.array(z.any()).describe("Documents to rerank"),
			}),
		},
	);

	/**
	 * Tool: Generate answer with citations
	 * Final step - generates a comprehensive answer using retrieved documents
	 */
	const generateAnswerTool = tool(
		async ({
			query,
			documents,
			userId,
			searchSpaceId,
			language,
			chatHistory,
		}: {
			query: string;
			documents: Document[];
			userId: string;
			searchSpaceId: number;
			language?: string;
			chatHistory?: { role: string; content: string }[];
		}) => {
			// This is a simplified version - in practice, you'd need to handle streaming
			// For now, we'll return a signal that answer generation should happen
			return JSON.stringify({
				message: "Answer generation initiated with documents",
				documentsCount: documents.length,
				willIncludeCitations: true,
			});
		},
		{
			name: "generate_answer",
			description: `Generate a comprehensive answer to the user's question using retrieved documents.

      This tool creates a detailed response with:
      - Citations to source documents
      - Markdown formatting
      - Language-appropriate response

      Use this as the FINAL step after searching and reranking documents.`,
			schema: z.object({
				query: z.string().describe("User's question"),
				documents: z.array(z.any()).describe("Retrieved and reranked documents"),
				userId: z.string(),
				searchSpaceId: z.number(),
				language: z.string().optional().describe("Response language"),
				chatHistory: z
					.array(
						z.object({
							role: z.string(),
							content: z.string(),
						}),
					)
					.optional(),
			}),
		},
	);

	/**
	 * Tool: Generate follow-up questions
	 * Creates contextual follow-up questions based on the conversation
	 */
	const generateFollowUpQuestionsTool = tool(
		async ({
			query,
			chatHistory,
			documents,
			userId,
			searchSpaceId,
		}: {
			query: string;
			chatHistory: { role: string; content: string }[];
			documents: Document[];
			userId: string;
			searchSpaceId: number;
		}) => {
			try {
				const llm = await llmService.getUserFastLLM(userId, searchSpaceId);
				if (!llm) {
					return JSON.stringify({ questions: [] });
				}

				const chatHistoryMessages: BaseMessage[] = chatHistory.map((msg) =>
					msg.role === "user"
						? new HumanMessage(msg.content)
						: new SystemMessage(msg.content),
				);

				// Format chat history
				const chatHistoryXml = chatHistoryMessages
					.map((msg) => {
						const msgType = (msg as any)._getType?.();
						if (msgType === "human") return `<user>${msg.content}</user>`;
						if (msgType === "ai") return `<assistant>${msg.content}</assistant>`;
						return "";
					})
					.filter((s) => s)
					.join("\n");

				// Format documents
				const documentsXml = documents
					.slice(0, 10)
					.map(
						(doc, i) => `<document>
<source_id>${doc.document?.id || i}</source_id>
<content>${doc.content}</content>
</document>`,
					)
					.join("\n");

				const humanMessageContent = `
<chat_history>
${chatHistoryXml}
</chat_history>

<documents>
${documentsXml}
</documents>

Based on the chat history and available documents above, generate 3-5 contextually relevant follow-up questions that would naturally extend the conversation and provide additional value to the user.

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
					promptsService.getFurtherQuestionsSystemPrompt();

				const response = await llm.invoke([
					new SystemMessage(systemPrompt),
					new HumanMessage(humanMessageContent),
				]);

				const content = String(response.content);
				const jsonMatch = content.match(/\{[\s\S]*\}/);

				if (jsonMatch) {
					const parsed = JSON.parse(jsonMatch[0]);
					return JSON.stringify(parsed.further_questions || []);
				}

				return JSON.stringify([]);
			} catch (error) {
				console.error("Error generating follow-up questions:", error);
				return JSON.stringify([]);
			}
		},
		{
			name: "generate_follow_up_questions",
			description: `Generate contextual follow-up questions based on the conversation and available documents.

      Use this tool AFTER answering the user's question to suggest relevant follow-up questions.
      The questions should be answerable using the available knowledge base.`,
			schema: z.object({
				query: z.string().describe("User's original question"),
				chatHistory: z.array(
					z.object({
						role: z.string(),
						content: z.string(),
					}),
				),
				documents: z.array(z.any()).describe("Retrieved documents"),
				userId: z.string(),
				searchSpaceId: z.number(),
			}),
		},
	);

	return {
		searchConnectorsTool,
		reformulateQueryTool,
		rerankDocumentsTool,
		generateAnswerTool,
		generateFollowUpQuestionsTool,
	};
}
