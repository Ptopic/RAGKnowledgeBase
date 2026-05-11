export const TOOLS = {
	archive: ["search_archive"],
	transcript: ["search_transcripts"],
	article: [
		"ask_user",
		"rewrite_article_title",
		"rewrite_article_ingress",
		"rewrite_article_content",
		"rewrite_article_content_partial",
		"update_article_title",
		"update_article_ingress",
		"update_article_content",
		"search_knowledge_base",
		"link_preview",
		"display_image",
	],
};

export const HIDDEN_TOOLS_ON_SUCCESS = {
	article: [],
	archive: ["search_articles"],
	transcript: ["search_transcripts"],
};

export const ALWAYS_HIDDEN_TOOLS = {
	article: ["detect_language"],
	archive: [],
	transcript: [],
};

export const PERSISTED_TOOLS = {
	article: [
		"rewrite_article_title",
		"rewrite_article_ingress",
		"rewrite_article_content",
		"rewrite_article_content_partial",
		"update_article_title",
		"update_article_ingress",
		"update_article_content",
	],
};

export const TOOL_MESSAGES = {
	ask_user: "Asking a clarifying question",
	search_articles: "Searching archive",
	search_transcripts: "Searching transcripts",
	search_knowledge_base: "Searching knowledge base",
	link_preview: "Generating link preview",
	display_image: "Rendering image",
	rewrite_article_title: "Rewriting article title",
	rewrite_article_ingress: "Rewriting article ingress",
	rewrite_article_content: "Rewriting article content",
	rewrite_article_content_partial:
		"Rewriting specified part of article content",
	update_article_title: "Updating article title",
	update_article_ingress: "Updating article ingress",
	update_article_content: "Updating article content",
};

export const TOOL_ERROR_MESSAGES = {
	search_articles: "Failed to search archive.",
	search_transcripts: "Failed to search transcripts.",
	search_knowledge_base: "Failed to search knowledge base.",
	link_preview: "Failed to load link preview.",
	display_image: "Failed to render image.",
	update_article_title: "Failed to update article title.",
	update_article_ingress: "Failed to update article ingress.",
	update_article_content: "Failed to update article content.",
	rewrite_article_title: "Failed to rewrite article title.",
	rewrite_article_ingress: "Failed to rewrite article ingress.",
	rewrite_article_content: "Failed to rewrite article content.",
	rewrite_article_content_partial:
		"Failed to rewrite specified part of article content.",
};
