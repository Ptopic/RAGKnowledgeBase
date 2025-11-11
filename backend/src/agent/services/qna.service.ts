import {
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { Injectable, Logger } from "@nestjs/common";
import { StreamingService } from "../streaming.service";
import {
	calculateTokenCount,
	Document,
	formatDocumentsSection,
	langchainChatHistoryToStr,
	optimizeDocumentsForTokenLimit,
} from "../utils/agent.utils";
import { LLMService } from "./llm.service";
import { RerankerService } from "./reranker.service";

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

			// Log language parameter for debugging
			this.logger.log(
				`Language parameter received: ${language || "undefined/not set"}`,
			);
			this.logger.log(`User query: ${userQuery}`);

			const rerankedDocuments = await this.rerankDocuments(
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

		await this.logger.log(
			`Reranking ${documents.map((doc) => doc.score)} documents for query.`,
		);
		try {
			const reranked = await this.rerankerService.rerankDocuments(
				query,
				documents,
			);
			await this.logger.log(
				`Reranking complete. ${reranked.map((doc) => doc.score)} documents returned.`,
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

		// ALWAYS get configured language from LLM config first (it takes priority)
		const effectiveLanguage =
			(await this.llmService.getUserFastLLMLanguage(userId, searchSpaceId)) ||
			language ||
			undefined;

		// Log the language being used
		this.logger.log(
			`Language from LLM config: ${await this.llmService.getUserFastLLMLanguage(userId, searchSpaceId)}`,
		);
		this.logger.log(`Language from request: ${language || "not set"}`);
		this.logger.log(
			`Using effective language: ${effectiveLanguage || "auto-detect from query"}`,
		);
		subscriber.next(
			streamingService.formatTerminalInfoDelta(
				`🌐 Response language: ${effectiveLanguage || "auto-detect"}`,
			),
		);

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
				effectiveLanguage,
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
			? this.getQnaCitationSystemPrompt(chatHistoryStr, effectiveLanguage)
			: this.getQnaNoDocumentsSystemPrompt(chatHistoryStr, effectiveLanguage);

		// Generate documents section
		const documentsText = hasDocuments
			? formatDocumentsSection(
					optimizedDocuments,
					"Source material from your personal knowledge base",
				)
			: "";

		// Add CRITICAL language instruction - making it IMPOSSIBLE to ignore
		const criticalLanguageInstruction = effectiveLanguage
			? `🚨🚨🚨 CRITICAL INSTRUCTION - READ THIS FIRST 🚨🚨🚨
Your ENTIRE response MUST be written in ${effectiveLanguage} language.
Do NOT use English unless ${effectiveLanguage} is English.
Use ONLY ${effectiveLanguage} language for EVERY word.
This is MANDATORY and NON-NEGOTIABLE.
🚨🚨🚨 END CRITICAL INSTRUCTION 🚨🚨🚨`
			: `🚨🚨🚨 CRITICAL INSTRUCTION - READ THIS FIRST 🚨🚨🚨
Look at the user's question below.
If it contains Croatian words like "Sta je", "Što je", "kako", "zašto" = RESPOND IN CROATIAN
If it contains English words = RESPOND IN ENGLISH
If it contains Swedish words = RESPOND IN SWEDISH
MATCH THE LANGUAGE OF THE QUESTION EXACTLY.
Do NOT translate the user's question to English.
Do NOT respond in English unless the question is in English.
🚨🚨🚨 END CRITICAL INSTRUCTION 🚨🚨🚨`;

		// Create final human message content with language instruction FIRST
		const instructionText = hasDocuments
			? `Please provide a detailed, comprehensive answer to the user's question using the information from their personal knowledge sources. Make sure to cite all information appropriately and engage in a conversational manner.${effectiveLanguage ? ` CRITICAL: Write your answer in ${effectiveLanguage} language!` : ""}`
			: `Please provide a helpful answer to the user's question based on our conversation history and your general knowledge. Engage in a conversational manner.${effectiveLanguage ? ` CRITICAL: Write your answer in ${effectiveLanguage} language!` : ""}`;

		const humanMessageContent = `${criticalLanguageInstruction}

    ${documentsText}

    User's question:
    <user_query>
        ${userQuery}
    </user_query>

    ${instructionText}

    🚨 REMINDER: ${effectiveLanguage ? `Respond ONLY in ${effectiveLanguage} language!` : "Respond in the SAME LANGUAGE as the question above. Check the question's language and match it!"} 🚨
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
			this.logger.log(
				`[TIMING] About to bind streaming LLM at ${new Date().toISOString()}`,
			);
			const bindStart = Date.now();

			// Enable streaming on the LLM
			const streamingLLM = llm.bind({
				streaming: true,
			} as any);

			const bindEnd = Date.now();
			this.logger.log(`[TIMING] LLM bind took ${bindEnd - bindStart}ms`);

			this.logger.log(
				`[TIMING] About to call streamingLLM.stream() at ${new Date().toISOString()}`,
			);
			subscriber.next(
				streamingService.formatTerminalInfoDelta(
					`⏳ Waiting for AI response...`,
				),
			);

			const streamStart = Date.now();
			const stream = await streamingLLM.stream(messagesWithChatHistory);
			const streamEnd = Date.now();

			this.logger.log(
				`[TIMING] streamingLLM.stream() call took ${streamEnd - streamStart}ms to return`,
			);
			subscriber.next(
				streamingService.formatTerminalInfoDelta(`✨ Streaming answer...`),
			);

			let chunkBuffer = "";
			const CHUNK_SIZE = 5; // Send every 5 characters instead of every character

			for await (const chunk of stream) {
				const content = chunk.content;
				if (content) {
					const delta = String(content);
					completeContent += delta;
					chunkBuffer += delta;

					// Only send when buffer reaches threshold
					if (chunkBuffer.length >= CHUNK_SIZE) {
						subscriber.next(streamingService.formatTextChunk(chunkBuffer));
						chunkBuffer = "";
					}
				}
			}

			// Send any remaining buffered content
			if (chunkBuffer.length > 0) {
				subscriber.next(streamingService.formatTextChunk(chunkBuffer));
			}

			// Final word count
			const finalWordCount = completeContent.split(/\s+/).length;
			subscriber.next(
				streamingService.formatTerminalInfoDelta(
					`✅ Answer complete (${finalWordCount} words)`,
				),
			);

			return (
				completeContent || "I couldn't generate an answer to this question."
			);
		} catch (error) {
			this.logger.error(
				`Error generating answer: ${error.message}`,
				error.stack,
			);

			// Send error message to subscriber so frontend knows what happened
			subscriber.next(
				streamingService.formatError(
					`Failed to generate answer: ${error.message}`,
				),
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
			? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST respond ONLY in ${language} language.

Every single word, sentence, explanation, and citation commentary must be in ${language}.

Do NOT use English. Do NOT translate to English.

This is MANDATORY and NON-NEGOTIABLE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
			: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST respond in the EXACT SAME LANGUAGE as the user's question.

Language Detection Rules:
- Croatian indicators: "Sta je", "Što je", "kako", "zašto", "koji" → Respond in CROATIAN
- English indicators: "What is", "How", "Why" → Respond in ENGLISH  
- Swedish indicators: "Vad är", "Hur" → Respond in SWEDISH

NEVER translate the user's question to English.
NEVER respond in English unless the question is in English.

This is MANDATORY and NON-NEGOTIABLE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

		return `${languageInstruction}

You are a helpful AI research assistant. Your task is to answer questions based on the user's personal knowledge base.

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
- Be conversational and helpful`;
	}

	/**
	 * Get QNA system prompt without documents
	 */
	private getQnaNoDocumentsSystemPrompt(
		chatHistory: string,
		language?: string,
	): string {
		const languageInstruction = language
			? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST respond ONLY in ${language} language.

Every single word, sentence, and explanation must be in ${language}.

Do NOT use English. Do NOT translate to English.

This is MANDATORY and NON-NEGOTIABLE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
			: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST respond in the EXACT SAME LANGUAGE as the user's question.

Language Detection Rules:
- Croatian indicators: "Sta je", "Što je", "kako", "zašto", "koji" → Respond in CROATIAN
- English indicators: "What is", "How", "Why" → Respond in ENGLISH
- Swedish indicators: "Vad är", "Hur" → Respond in SWEDISH

NEVER translate the user's question to English.
NEVER respond in English unless the question is in English.

This is MANDATORY and NON-NEGOTIABLE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

		return `${languageInstruction}

You are a helpful AI assistant. Answer the user's question based on the conversation history and your general knowledge.

${chatHistory ? `Previous conversation:\n${chatHistory}` : ""}

ANSWER GUIDELINES:
- Provide comprehensive, well-structured answers
- Use markdown formatting for readability
- Be conversational and helpful
- If you're not certain, acknowledge limitations`;
	}
}
