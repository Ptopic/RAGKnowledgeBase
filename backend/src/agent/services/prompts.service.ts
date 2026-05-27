import { Injectable } from "@nestjs/common";

/**
 * Prompts service for managing all agent prompts
 */
@Injectable()
export class PromptsService {
	/**
	 * Build language instruction for prompts
	 */
	private buildLanguageInstruction(language?: string): string {
		if (language) {
			return `\n\nIMPORTANT: Please respond in ${language} language. All your responses, explanations, and analysis should be written in ${language}.`;
		}
		return "";
	}

	/**
	 * Get query reformulation system prompt
	 */
	getQueryReformulationSystemPrompt(): string {
		return `You are an expert at reformulating search queries based on conversation context.

Your task is to analyze the chat history and the current query to create an improved search query that:
1. Incorporates relevant context from the conversation
2. Clarifies any ambiguous references or pronouns
3. Expands abbreviations or implicit references
4. Maintains the user's intent

Guidelines:
- If there is no chat history, return the original query unchanged
- Keep the reformulated query concise and focused
- Preserve technical terms and specific keywords
- Add clarifying context without making the query too long
- Ensure the query is optimized for semantic search

Respond with ONLY the reformulated query, no explanations or additional text.`;
	}
}
