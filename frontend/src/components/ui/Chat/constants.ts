/**
 * Tool display names for the assistant UI.
 * Maps backend tool names to human-readable labels.
 *
 * Our backend (backend/src/agent/tools/registry.ts) defines these tools:
 * - search_knowledge_base
 * - display_image
 * - analyze_image
 * - index_document
 * - index_webpage
 * - index_youtube
 * - parse_date_range
 * - generate_followup_questions
 */
export const TOOL_MESSAGES = {
	search_knowledge_base: "Searching knowledge base",
	display_image: "Rendering image",
	analyze_image: "Analyzing image",
	index_document: "Indexing document",
	index_webpage: "Indexing web page",
	index_youtube: "Indexing YouTube video",
	parse_date_range: "Generating date range",
	generate_followup_questions: "Generating follow-up questions",
} as const;
/**
 * Error messages for tool calls.
 */
export const TOOL_ERROR_MESSAGES = {
	search_knowledge_base: "Failed to search knowledge base.",
	display_image: "Failed to render image.",
	analyze_image: "Failed to analyze image.",
	index_document: "Failed to index document.",
	index_webpage: "Failed to index web page.",
	index_youtube: "Failed to index YouTube video.",
	parse_date_range: "Failed to parse date range.",
	generate_followup_questions: "Failed to generate follow-up questions.",
} as const;