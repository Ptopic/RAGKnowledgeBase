export const PERSISTED_TOOLS = {
	LINK_PREVIEW: ["link_preview", "multi_link_preview"],
	DISPLAY_IMAGE: ["display_image"],
	SEARCH_KNOWLEDGE_BASE: ["search_knowledge_base"],
} as const;

export const ALL_PERSISTED_TOOLS = Object.values(PERSISTED_TOOLS).flat() as const;

export type PersistedToolName = typeof ALL_PERSISTED_TOOLS[number];
