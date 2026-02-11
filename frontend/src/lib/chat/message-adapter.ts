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
