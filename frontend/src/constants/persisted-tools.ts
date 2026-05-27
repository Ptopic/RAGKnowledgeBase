export const PERSISTED_TOOLS = {
	LINK_PREVIEW: ["link_preview", "multi_link_preview"],
	DISPLAY_IMAGE: ["display_image"],
	ANALYZE_IMAGE: ["analyze_image"],
	SEARCH_KNOWLEDGE_BASE: ["search_knowledge_base"],
	INDEX_DOCUMENT: ["index_document"],
	INDEX_WEBPAGE: ["index_webpage"],
	INDEX_YOUTUBE: ["index_youtube"],
} as const;

export const ALL_PERSISTED_TOOLS = Object.values(PERSISTED_TOOLS).flat() as const;

export type PersistedToolName = typeof ALL_PERSISTED_TOOLS[number];
