import { AIMessage, type Message, ToolMessage } from "@langchain/core/messages";

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

export function convertToLangChainMessages(apiMessages: unknown[]): Message[] {
	const convertSingleMessage = (msg: any, index: number): Message => {
		const id = msg.id || `msg_${index}`;
		if (msg.role === "user") {
			return { type: "human", content: msg.content, id };
		}
		if (msg.role === "assistant") {
			return { type: "ai", content: msg.content, id };
		}
		return { type: "system", content: msg.content, id };
	};

	if (apiMessages.length > 0 && Array.isArray(apiMessages[0])) {
		const flatMessages = (apiMessages as any[]).flat();
		const reconstructed: Message[] = [];

		for (let i = 0; i < flatMessages.length; i++) {
			const msg = flatMessages[i];

			if (msg.metadata?.kind?.startsWith("tool_")) {
				const metadata = msg.metadata;
				const runId = metadata.runId || `${msg.timestamp}`;
				const toolName = metadata.toolName || "unknown";
				const toolArgs = metadata.args ?? {};
				const toolResult = metadata.data;
				const toolStatus = metadata.status as "success" | "error" | undefined;

				reconstructed.push(
					new AIMessage({
						id: `${msg.timestamp}_tool_call_${i}`,
						content: "",
						tool_calls: [
							{
								id: runId,
								name: toolName,
								args: toolArgs,
							},
						],
					}),
				);

				reconstructed.push(
					new ToolMessage({
						tool_call_id: runId,
						content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
						name: toolName,
						status: toolStatus,
					}),
				);

				continue;
			}

			reconstructed.push(convertSingleMessage(msg, reconstructed.length));
		}

		return reconstructed as Message[];
	}

	return apiMessages.map(convertSingleMessage) as Message[];
}
