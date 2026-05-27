import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export function createGenerateFollowupQuestionsTool() {
	return new DynamicStructuredTool({
		name: "generate_followup_questions",
		description:
			"Call this tool ONCE at the end of EVERY response to generate 3-5 contextual follow-up prompts. NEVER write follow-up prompts as text in your response — ONLY call this tool. Analyze the conversation flow (topics, user interests, gaps, depth level) and generate prompts that: explore new angles, progress the conversation forward, match user expertise, and consider practical applications/comparisons/deeper analysis. When there is insufficient context (e.g., user only said 'Hello', 'Hi', 'Help'), use the fallback prompts translated into the configured response language: 'Search for all documents in my knowledge base', 'Search for all webpages in my knowledge base', 'Show me my recent notes and files', 'Find my recent tasks and meetings'. Phrase as direct user commands/requests (NOT questions). Example: 'Summarize the quarterly report for me' NOT 'Do you want me to summarize the report?'",
		schema: z.object({
			questions: z
				.array(z.string())
				.min(1)
				.max(5)
				.describe(
					"Array of 3-5 concise follow-up prompts (3-8 words each). Phrase as direct user commands/requests (not questions). Use fallback prompts translated into the configured response language when context is insufficient. Ordered by relevance and natural progression. Must NOT end with a question mark.",
				),
		}),
		func: async ({ questions }) => JSON.stringify(questions),
	});
}
