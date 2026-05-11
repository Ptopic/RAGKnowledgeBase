/**
 * Tool display names for the assistant UI.
 * Maps backend tool names to human-readable labels.
 *
 * Our backend (backend/src/agent/tools/registry.ts) defines exactly 3 tools:
 * - search_knowledge_base
 * - link_preview
 * - display_image
 */
export const TOOL_MESSAGES = {
	search_knowledge_base: "Searching knowledge base",
	link_preview: "Generating link preview",
	display_image: "Rendering image",
} as const;

/**
 * Error messages for tool calls.
 * Kept minimal since only our 3 active tools are represented.
 */
export const TOOL_ERROR_MESSAGES = {
	search_knowledge_base: "Failed to search knowledge base.",
	link_preview: "Failed to load link preview.",
	display_image: "Failed to render image.",
} as const;
