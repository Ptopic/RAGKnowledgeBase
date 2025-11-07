import { Injectable, Logger } from '@nestjs/common';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { LLMService } from './llm.service';

@Injectable()
export class QueryService {
	private readonly logger = new Logger(QueryService.name);

	constructor(private readonly llmService: LLMService) {}

	/**
	 * Reformulate the user query using the user's strategic LLM to make it more
	 * effective for information retrieval and research purposes.
	 */
	async reformulateQueryWithChatHistory(
		userQuery: string,
		userId: string,
		searchSpaceId: number,
		chatHistoryStr?: string,
	): Promise<string> {
		if (!userQuery || !userQuery.trim()) {
			return userQuery;
		}

		try {
			// Get the user's strategic LLM instance
			const llm = await this.llmService.getUserStrategicLLM(
				userId,
				searchSpaceId,
			);

			if (!llm) {
				this.logger.warn(
					`No strategic LLM configured for user ${userId} in search space ${searchSpaceId}. Using original query.`,
				);
				return userQuery;
			}

			// Create system message with instructions
			const todayDate = new Date().toISOString().split('T')[0];
			const systemMessage = new SystemMessage(`
Today's date: ${todayDate}
You are a highly skilled AI assistant specializing in query optimization for advanced research.
Your primary objective is to transform a user's initial query into a highly effective search query.
This reformulated query will be used to retrieve information from diverse data sources.

**Chat History Context:**
${chatHistoryStr || 'No prior conversation history is available.'}
If chat history is provided, analyze it to understand the user's evolving information needs and the broader context of their request. Use this understanding to refine the current query, ensuring it builds upon or clarifies previous interactions.

**Query Reformulation Guidelines:**
Your reformulated query should:
1.  **Enhance Specificity and Detail:** Add precision to narrow the search focus effectively, making the query less ambiguous and more targeted.
2.  **Resolve Ambiguities:** Identify and clarify vague terms or phrases. If a term has multiple meanings, orient the query towards the most likely one given the context.
3.  **Expand Key Concepts:** Incorporate relevant synonyms, related terms, and alternative phrasings for core concepts. This helps capture a wider range of relevant documents.
4.  **Deconstruct Complex Questions:** If the original query is multifaceted, break it down into its core searchable components or rephrase it to address each aspect clearly. The final output must still be a single, coherent query string.
5.  **Optimize for Comprehensiveness:** Ensure the query is structured to uncover all essential facets of the original request, aiming for thorough information retrieval suitable for research.
6.  **Maintain User Intent:** The reformulated query must stay true to the original intent of the user's query. Do not introduce new topics or shift the focus significantly.

**Crucial Constraints:**
*   **Conciseness and Effectiveness:** While aiming for comprehensiveness, the reformulated query MUST be as concise as possible. Eliminate all unnecessary verbosity. Focus on essential keywords, entities, and concepts that directly contribute to effective retrieval.
*   **Single, Direct Output:** Return ONLY the reformulated query itself. Do NOT include any explanations, introductory phrases (e.g., "Reformulated query:", "Here is the optimized query:"), or any other surrounding text or markdown formatting.

Your output should be a single, optimized query string, ready for immediate use in a search system.
			`);

			// Create human message with the user query
			const humanMessage = new HumanMessage(
				`Reformulate this query for better research results: ${userQuery}`,
			);

			// Get the response from the LLM
			const response = await llm.invoke([systemMessage, humanMessage]);

			// Extract the reformulated query from the response
			const reformulatedQuery = response.content.toString().trim();

			// Return the original query if the reformulation is empty
			if (!reformulatedQuery) {
				return userQuery;
			}

			return reformulatedQuery;
		} catch (error) {
			// Log the error and return the original query
			this.logger.error(`Error reformulating query: ${error.message}`);
			return userQuery;
		}
	}

	/**
	 * Convert a list of chat history messages to a string.
	 */
	static langchainChatHistoryToStr(chatHistory: any[]): string {
		let chatHistoryStr = '<chat_history>\n';

		for (const chatMessage of chatHistory) {
			if (chatMessage instanceof HumanMessage) {
				chatHistoryStr += `<user>${chatMessage.content}</user>\n`;
			} else if (chatMessage instanceof AIMessage) {
				chatHistoryStr += `<assistant>${chatMessage.content}</assistant>\n`;
			} else if (chatMessage instanceof SystemMessage) {
				chatHistoryStr += `<system>${chatMessage.content}</system>\n`;
			}
		}

		chatHistoryStr += '</chat_history>';
		return chatHistoryStr;
	}
}
