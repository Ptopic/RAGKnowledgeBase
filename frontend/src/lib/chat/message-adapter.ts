import type { Message } from "@langchain/core/messages";

export function messageContentToText(content: unknown): string {
	if (typeof content === "string") return content;
	if (content === null || content === undefined) return "";
	if (Array.isArray(content)) {
		return content
			.map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
			.join("\n");
	}
	if (typeof content === "object") return JSON.stringify(content);
	return String(content);
}

export function toRenderableMessages(messages: Message[]): Message[] {
	return messages.filter((message) => {
		return message.type === "human" || message.type === "ai";
	});
}

export interface PersistedToolCall {
	type: "tool-call";
	toolName: string;
	runId: string;
	args?: Record<string, unknown>;
	result?: unknown;
	error?: string;
	status?: "success" | "error";
}

export interface MessageContentPart {
	type?: "tool-call" | "text";
	[key: string]: unknown;
}

export function parsePersistedMessage(
	content: unknown,
): {
	isToolCall: boolean;
	parsedContent: PersistedToolCall | null;
	textContent: string;
} {
	if (typeof content !== "string") {
		return { isToolCall: false, parsedContent: null, textContent: "" };
	}

	try {
		const parsed = JSON.parse(content) as PersistedToolCall | MessageContentPart;

		if (
			parsed &&
			typeof parsed === "object" &&
			(parsed.type === "tool-call" || parsed.toolName)
		) {
			return {
				isToolCall: true,
				parsedContent: parsed as PersistedToolCall,
				textContent: "",
			};
		}
	} catch {
		// Not JSON or invalid format, treat as text
	}

	return { isToolCall: false, parsedContent: null, textContent: content };
}

export interface ThinkingStep {
	id: string;
	title: string;
	status: "pending" | "in_progress" | "completed";
	items: string[];
}

export function extractThinkingStepsFromMessage(message: Message): ThinkingStep[] {
	void message;
	return [];
}
