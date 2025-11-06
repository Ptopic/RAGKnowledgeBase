import { encoding_for_model, TiktokenModel } from "tiktoken";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Document token information
 */
export interface DocumentTokenInfo {
	index: number;
	document: Document;
	formattedContent: string;
	tokenCount: number;
}

/**
 * Document interface
 */
export interface Document {
	chunk_id: string | number;
	content: string;
	score?: number;
	document: {
		id: string | number;
		title: string;
		document_type: string;
		metadata: Record<string, any>;
	};
	source?: string;
}

/**
 * Get connector emoji for display
 */
export function getConnectorEmoji(connectorName: string): string {
	const connectorEmojis: Record<string, string> = {
		YOUTUBE_VIDEO: "📹",
		EXTENSION: "🧩",
		CRAWLED_URL: "🌐",
		FILE: "📄",
		SLACK_CONNECTOR: "💬",
		NOTION_CONNECTOR: "📘",
		GITHUB_CONNECTOR: "🐙",
		LINEAR_CONNECTOR: "📊",
		JIRA_CONNECTOR: "🎫",
		DISCORD_CONNECTOR: "🗨️",
		TAVILY_API: "🔍",
		LINKUP_API: "🔗",
		BAIDU_SEARCH_API: "🇨🇳",
		GOOGLE_CALENDAR_CONNECTOR: "📅",
		GOOGLE_GMAIL_CONNECTOR: "📧",
		AIRTABLE_CONNECTOR: "🗃️",
		LUMA_CONNECTOR: "✨",
		ELASTICSEARCH_CONNECTOR: "⚡",
		CONFLUENCE_CONNECTOR: "🏢",
		CLICKUP_CONNECTOR: "✅",
	};
	return connectorEmojis[connectorName] || "🔎";
}

/**
 * Get user-friendly connector name
 */
export function getConnectorFriendlyName(connectorName: string): string {
	const connectorFriendlyNames: Record<string, string> = {
		YOUTUBE_VIDEO: "YouTube",
		EXTENSION: "Browser Extension",
		CRAWLED_URL: "Web Pages",
		FILE: "Files",
		SLACK_CONNECTOR: "Slack",
		NOTION_CONNECTOR: "Notion",
		GITHUB_CONNECTOR: "GitHub",
		LINEAR_CONNECTOR: "Linear",
		JIRA_CONNECTOR: "Jira",
		CONFLUENCE_CONNECTOR: "Confluence",
		GOOGLE_CALENDAR_CONNECTOR: "Google Calendar",
		GOOGLE_GMAIL_CONNECTOR: "Gmail",
		DISCORD_CONNECTOR: "Discord",
		TAVILY_API: "Tavily Search",
		LINKUP_API: "Linkup Search",
		BAIDU_SEARCH_API: "Baidu Search",
		AIRTABLE_CONNECTOR: "Airtable",
		LUMA_CONNECTOR: "Luma",
		ELASTICSEARCH_CONNECTOR: "Elasticsearch",
		CLICKUP_CONNECTOR: "ClickUp",
	};
	return connectorFriendlyNames[connectorName] || connectorName;
}

/**
 * Format a single document for citation in XML format
 */
export function formatDocumentForCitation(document: Document): string {
	const content = document.content || "";
	const docInfo = document.document || ({} as any);
	const documentId = document.chunk_id || "";
	const documentType = docInfo.document_type || "CRAWLED_URL";

	return `<document>
  <metadata>
    <source_id>${documentId}</source_id>
    <source_type>${documentType}</source_type>
  </metadata>
  <content>
    ${content}
  </content>
</document>`;
}

/**
 * Format multiple documents into a complete documents section
 */
export function formatDocumentsSection(
	documents: Document[],
	sectionTitle: string = "Source material",
): string {
	if (!documents || documents.length === 0) {
		return "";
	}

	const formattedDocs = documents
		.map((doc) => formatDocumentForCitation(doc))
		.join("\n");

	return `${sectionTitle}:
<documents>
${formattedDocs}
</documents>`;
}

/**
 * Convert LangChain messages to simple format for token counting
 */
export function convertLangChainMessagesToDict(
	messages: BaseMessage[],
): Array<{ role: string; content: string }> {
	const roleMapping: Record<string, string> = {
		system: "system",
		human: "user",
		ai: "assistant",
	};

	return messages.map((msg) => {
		const msgType = (msg as any)._getType?.() || "user";
		const role = roleMapping[msgType] || "user";
		return {
			role,
			content: String(msg.content),
		};
	});
}

/**
 * Calculate token count for messages using tiktoken
 */
export function calculateTokenCount(
	messages: BaseMessage[],
	modelName: string,
): number {
	try {
		// Map model names to tiktoken models
		let tiktokenModel: TiktokenModel = "gpt-3.5-turbo";

		if (modelName.includes("gpt-4")) {
			tiktokenModel = "gpt-4";
		} else if (modelName.includes("gpt-3.5")) {
			tiktokenModel = "gpt-3.5-turbo";
		}

		const encoding = encoding_for_model(tiktokenModel);
		const messagesDict = convertLangChainMessagesToDict(messages);

		let totalTokens = 0;
		for (const message of messagesDict) {
			// Count tokens for role and content
			totalTokens += encoding.encode(message.role).length;
			totalTokens += encoding.encode(message.content).length;
			totalTokens += 3; // Every message follows <|start|>{role/name}\n{content}<|end|>\n
		}
		totalTokens += 3; // Every reply is primed with <|start|>assistant<|message|>

		encoding.free();
		return totalTokens;
	} catch (error) {
		console.warn(`Error calculating token count: ${error.message}`);
		// Rough estimate: ~4 characters per token
		const text = messages.map((m) => String(m.content)).join(" ");
		return Math.ceil(text.length / 4);
	}
}

/**
 * Calculate token costs for each document
 */
export function calculateDocumentTokenCosts(
	documents: Document[],
	modelName: string,
): DocumentTokenInfo[] {
	const documentTokenInfo: DocumentTokenInfo[] = [];

	for (let i = 0; i < documents.length; i++) {
		const doc = documents[i];
		const formattedDoc = formatDocumentForCitation(doc);

		// Calculate token count for this document
		const tokenCount = estimateTokenCount(formattedDoc);

		documentTokenInfo.push({
			index: i,
			document: doc,
			formattedContent: formattedDoc,
			tokenCount,
		});
	}

	return documentTokenInfo;
}

/**
 * Estimate token count for a text string
 */
function estimateTokenCount(text: string): number {
	// Rough estimate: ~4 characters per token
	// This is a fallback; ideally use tiktoken but it's complex for dynamic text
	return Math.ceil(text.length / 4);
}

/**
 * Find optimal documents using binary search
 */
export function findOptimalDocumentsWithBinarySearch(
	documentTokens: DocumentTokenInfo[],
	availableTokens: number,
): DocumentTokenInfo[] {
	if (!documentTokens || documentTokens.length === 0 || availableTokens <= 0) {
		return [];
	}

	let left = 0;
	let right = documentTokens.length;
	let optimalDocs: DocumentTokenInfo[] = [];

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		const currentDocs = documentTokens.slice(0, mid);
		const currentTokenSum = currentDocs.reduce(
			(sum, doc) => sum + doc.tokenCount,
			0,
		);

		if (currentTokenSum <= availableTokens) {
			optimalDocs = currentDocs;
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	return optimalDocs;
}

/**
 * Get model context window size
 */
export function getModelContextWindow(modelName: string): number {
	// Context windows for common models
	const contextWindows: Record<string, number> = {
		"gpt-4": 8192,
		"gpt-4-32k": 32768,
		"gpt-4-turbo": 128000,
		"gpt-4o": 128000,
		"gpt-4o-mini": 128000,
		"gpt-3.5-turbo": 16385,
		"gpt-3.5-turbo-16k": 16385,
		"claude-3-opus": 200000,
		"claude-3-sonnet": 200000,
		"claude-3-haiku": 200000,
		"claude-3-5-sonnet": 200000,
	};

	// Try to match model name
	for (const [key, value] of Object.entries(contextWindows)) {
		if (modelName.toLowerCase().includes(key.toLowerCase())) {
			return value;
		}
	}

	// Default fallback
	console.warn(
		`Context window not found for model ${modelName}, using default 4096`,
	);
	return 4096;
}

/**
 * Optimize documents to fit within token limits using binary search
 */
export function optimizeDocumentsForTokenLimit(
	documents: Document[],
	baseMessages: BaseMessage[],
	modelName: string,
): { optimizedDocuments: Document[]; hasDocuments: boolean } {
	if (!documents || documents.length === 0) {
		return { optimizedDocuments: [], hasDocuments: false };
	}

	const contextWindow = getModelContextWindow(modelName);
	const baseTokens = calculateTokenCount(baseMessages, modelName);
	const availableTokensForDocs = contextWindow - baseTokens;

	console.log(
		`Token optimization: Context window=${contextWindow}, Base=${baseTokens}, Available for docs=${availableTokensForDocs}`,
	);

	if (availableTokensForDocs <= 0) {
		console.log("No tokens available for documents after base content");
		return { optimizedDocuments: [], hasDocuments: false };
	}

	// Calculate token costs for all documents
	const documentTokenInfo = calculateDocumentTokenCosts(documents, modelName);

	// Find optimal number of documents using binary search
	const optimalDocInfo = findOptimalDocumentsWithBinarySearch(
		documentTokenInfo,
		availableTokensForDocs,
	);

	// Extract the original document objects
	const optimizedDocuments = optimalDocInfo.map((info) => info.document);
	const hasDocuments = optimizedDocuments.length > 0;

	console.log(
		`Token optimization result: Using ${optimizedDocuments.length}/${documents.length} documents`,
	);

	return { optimizedDocuments, hasDocuments };
}

/**
 * Convert LangChain chat history to string
 */
export function langchainChatHistoryToStr(
	chatHistory: BaseMessage[],
): string {
	let chatHistoryStr = "";

	for (const chatMessage of chatHistory) {
		const msgType = (chatMessage as any)._getType?.();

		if (msgType === "human") {
			chatHistoryStr += `<user>${chatMessage.content}</user>\n`;
		} else if (msgType === "ai") {
			chatHistoryStr += `<assistant>${chatMessage.content}</assistant>\n`;
		} else if (msgType === "system") {
			chatHistoryStr += `<system>${chatMessage.content}</system>\n`;
		}
	}

	return chatHistoryStr;
}
