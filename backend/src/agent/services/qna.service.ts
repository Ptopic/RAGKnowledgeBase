import { Injectable, Logger } from "@nestjs/common";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RerankerService } from "./reranker.service";
import { LLMService } from "./llm.service";
import { StreamingService } from "../streaming.service";
import {
    Document,
    optimizeDocumentsForTokenLimit,
    formatDocumentsSection,
    langchainChatHistoryToStr,
    calculateTokenCount,
} from "../utils/agent.utils";
import { BaseMessage } from "@langchain/core/messages";

interface QNAConfig {
	userQuery: string;
	reformulatedQuery: string;
	relevantDocuments: Document[];
	userId: string;
	searchSpaceId: number;
	language?: string;
	chatHistory: BaseMessage[];
}

/**
 * QNA Agent Service
 * Handles the Q&A workflow: rerank documents -> generate answer with citations
 */
@Injectable()
export class QNAService {
	private readonly logger = new Logger(QNAService.name);

	constructor(
		private rerankerService: RerankerService,
		private llmService: LLMService,
	) {}

	/**
	 * Main QNA workflow
	 */
	async handleQNA(
		config: QNAConfig,
		subscriber: any,
		streamingService: StreamingService,
	): Promise<{ answer: string; rerankedDocuments: Document[] }> {
		const {
			userQuery,
			reformulatedQuery,
			relevantDocuments,
			userId,
			searchSpaceId,
			language,
			chatHistory,
		} = config;

		try {
			// Step 1: Rerank documents
			subscriber.next(
				streamingService.formatTerminalInfoDelta(
					"🔄 Reranking documents by relevance...",
				),
			);

			let rerankedDocuments = await this.rerankDocuments(
				userQuery + "\n" + reformulatedQuery,
				relevantDocuments,
			);

			if (rerankedDocuments.length > 0) {
				subscriber.next(
					streamingService.formatTerminalInfoDelta(
						`✅ Reranked ${rerankedDocuments.length} documents`,
					),
				);
			}

			// Step 2: Generate answer with token optimization
			subscriber.next(
				streamingService.formatTerminalInfoDelta(
					"✍️ Generating answer with citations...",
				),
			);

			const answer = await this.answerQuestion(
				userQuery,
				rerankedDocuments,
				userId,
				searchSpaceId,
				language,
				chatHistory,
				subscriber,
				streamingService,
			);

			return { answer, rerankedDocuments };
		} catch (error) {
			this.logger.error(`Error in QNA workflow: ${error.message}`, error.stack);
			throw error;
		}
	}

	/**
	 * Rerank documents based on relevance
	 */
	private async rerankDocuments(
		query: string,
		documents: Document[],
	): Promise<Document[]> {
		if (!documents || documents.length === 0) {
			return [];
		}

		try {
			const reranked = await this.rerankerService.rerankDocuments(
				query,
				documents,
			);
			return reranked;
		} catch (error) {
			this.logger.error(
				`Error reranking documents: ${error.message}`,
				error.stack,
			);
			// Return original documents if reranking fails
			return documents;
		}
	}

	/**
	 * Answer question with token optimization
	 */
	private async answerQuestion(
		userQuery: string,
		documents: Document[],
		userId: string,
		searchSpaceId: number,
		language: string | undefined,
		chatHistory: BaseMessage[],
		subscriber: any,
		streamingService: StreamingService,
	): Promise<string> {
		// Get user's fast LLM
		const llm = await this.llmService.getUserFastLLM(userId, searchSpaceId);
		if (!llm) {
			const errorMessage = `No fast LLM configured for user ${userId} in search space ${searchSpaceId}`;
			this.logger.error(errorMessage);
			throw new Error(errorMessage);
		}

		// Get model name for token counting
		const modelName = this.llmService.getModelName(llm);

		// Determine if we have documents and optimize for token limits
		const hasDocumentsInitially = documents && documents.length > 0;
		const chatHistoryStr = langchainChatHistoryToStr(chatHistory);

		let optimizedDocuments = documents;
		let hasDocuments = hasDocumentsInitially;

		if (hasDocumentsInitially) {
			// Create base message template for token calculation (without documents)
			const baseHumanMessageTemplate = `

        User's question:
        <user_query>
            ${userQuery}
        </user_query>

        Please provide a detailed, comprehensive answer to the user's question using the information from their personal knowledge sources. Make sure to cite all information appropriately and engage in a conversational manner.
        `;

			// Use initial system prompt for token calculation
			const initialSystemPrompt = this.getQnaCitationSystemPrompt(
				chatHistoryStr,
				language,
			);
			const baseMessages = [
				new SystemMessage(initialSystemPrompt),
				new HumanMessage(baseHumanMessageTemplate),
			];

			// Optimize documents to fit within token limits
			const result = optimizeDocumentsForTokenLimit(
				documents,
				baseMessages,
				modelName,
			);
			optimizedDocuments = result.optimizedDocuments;
			hasDocuments = result.hasDocuments;

			if (optimizedDocuments.length < documents.length) {
				subscriber.next(
					streamingService.formatTerminalInfoDelta(
						`⚠️ Token limit reached: using ${optimizedDocuments.length}/${documents.length} documents`,
					),
				);
			}
		}

		// Choose system prompt based on final document availability
		const systemPrompt = hasDocuments
			? this.getQnaCitationSystemPrompt(chatHistoryStr, language)
			: this.getQnaNoDocumentsSystemPrompt(chatHistoryStr, language);

		// Generate documents section
		const documentsText = hasDocuments
			? formatDocumentsSection(
					optimizedDocuments,
					"Source material from your personal knowledge base",
				)
			: "";

		// Create final human message content
		const instructionText = hasDocuments
			? "Please provide a detailed, comprehensive answer to the user's question using the information from their personal knowledge sources. Make sure to cite all information appropriately and engage in a conversational manner."
			: "Please provide a helpful answer to the user's question based on our conversation history and your general knowledge. Engage in a conversational manner.";

		const humanMessageContent = `
    ${documentsText}

    User's question:
    <user_query>
        ${userQuery}
    </user_query>

    ${instructionText}
    `;

		// Create final messages for the LLM
		const messagesWithChatHistory = [
			new SystemMessage(systemPrompt),
			new HumanMessage(humanMessageContent),
		];

		// Log final token count
		const totalTokens = calculateTokenCount(messagesWithChatHistory, modelName);
		this.logger.log(`Final token count: ${totalTokens}`);
		subscriber.next(
			streamingService.formatTerminalInfoDelta(
				`📊 Token count: ${totalTokens}`,
			),
		);

		// Call the LLM with streaming
		let completeContent = "";

		try {
			// Enable streaming on the LLM
			const streamingLLM = llm.bind({
				streaming: true,
			} as any);

			const stream = await streamingLLM.stream(messagesWithChatHistory);

			for await (const chunk of stream) {
				const content = chunk.content;
				if (content) {
					const delta = String(content);
					completeContent += delta;

					// Stream to subscriber
					subscriber.next(streamingService.formatTextChunk(delta));

					// Update word count periodically
					if (completeContent.length % 100 === 0) {
						const wordCount = completeContent.split(/\s+/).length;
						subscriber.next(
							streamingService.formatTerminalInfoDelta(
								`✍️ Writing answer... (${wordCount} words)`,
							),
						);
					}
				}
			}

			// Final word count
			const finalWordCount = completeContent.split(/\s+/).length;
			subscriber.next(
				streamingService.formatTerminalInfoDelta(
					`✅ Answer complete (${finalWordCount} words)`,
				),
			);

			return completeContent || "I couldn't generate an answer to this question.";
		} catch (error) {
			this.logger.error(
				`Error generating answer: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}

	/**
	 * Get QNA system prompt with citations
	 */
	private getQnaCitationSystemPrompt(
		chatHistory: string,
		language?: string,
	): string {
		const languageInstruction = language
			? `\n\nIMPORTANT: Please respond in ${language} language. All your responses, explanations, and analysis should be written in ${language}.`
			: "";

		return `You are a helpful AI research assistant. Your task is to answer questions based on the user's personal knowledge base.

${chatHistory ? `Previous conversation:\n${chatHistory}` : ""}

CITATION INSTRUCTIONS:
- You MUST cite sources using [citation:source_id] format immediately after making claims
- Use the source_id from the document metadata
- Multiple citations for the same claim: [citation:source_id1][citation:source_id2]
- Place citations at the end of sentences or claims
- Every factual claim should have at least one citation

ANSWER GUIDELINES:
- Provide comprehensive, well-structured answers
- Use markdown formatting for readability
- If sources conflict, mention different perspectives with citations
- If information is insufficient, acknowledge limitations
- Be conversational and helpful${languageInstruction}`;
	}

	/**
	 * Get QNA system prompt without documents
	 */
	private getQnaNoDocumentsSystemPrompt(
		chatHistory: string,
		language?: string,
	): string {
		const languageInstruction = language
			? `\n\nIMPORTANT: Please respond in ${language} language. All your responses, explanations, and analysis should be written in ${language}.`
			: "";

		return `You are a helpful AI assistant. Answer the user's question based on the conversation history and your general knowledge.

${chatHistory ? `Previous conversation:\n${chatHistory}` : ""}

ANSWER GUIDELINES:
- Provide comprehensive, well-structured answers
- Use markdown formatting for readability
- Be conversational and helpful
- If you're not certain, acknowledge limitations${languageInstruction}`;
	}
}
