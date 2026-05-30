import type { AIMessage, Message, ToolMessage } from "@langchain/core/messages";
import { messageContentToText } from "@/lib/chat/message-adapter";
import type { OrderedStreamMessage } from "@/types/chat.types";

export function getOrderedMessages(
	messages: Message[],
): OrderedStreamMessage[] {
	const ordered: OrderedStreamMessage[] = [];

	const toolCallIdToArgs = new Map<string, Record<string, unknown>>();
	for (const msg of messages) {
		if (msg.type === "ai") {
			const aiMsg = msg as AIMessage;
			if (Array.isArray(aiMsg.tool_calls)) {
				for (const tc of aiMsg.tool_calls) {
					if (tc.id && tc.args && typeof tc.args === "object") {
						toolCallIdToArgs.set(tc.id, tc.args as Record<string, unknown>);
					}
				}
			}
		}
	}

	for (const msg of messages) {
		// Skip system and human messages (handled separately)
		if (msg.type === "system" || msg.type === "human") {
			continue;
		}

		if (msg.type === "ai") {
			const aiMsg = msg as AIMessage;
			const contentText = messageContentToText(aiMsg.content);
			// Skip empty AI messages (those before tool calls without content)
			if (!contentText || contentText.trim() === "") {
				continue;
			}
			ordered.push({
				type: "ai",
				content: contentText,
				...(aiMsg.additional_kwargs
					? { metadata: aiMsg.additional_kwargs as Record<string, unknown> }
					: {}),
			});
		} else if (msg.type === "tool") {
			const toolMsg = msg as ToolMessage;

			// Skip tool messages with errors - don't save/display them
			if (toolMsg.status === "error") {
				continue;
			}

			if (!toolMsg.tool_call_id) continue;

			// Parse tool content (can be string or object)
			let toolData: unknown;
			if (typeof toolMsg.content === "string") {
				try {
					toolData = JSON.parse(toolMsg.content);
				} catch {
					toolData = { content: toolMsg.content };
				}
			} else {
				toolData = toolMsg.content;
			}

			const toolDataRecord =
				typeof toolData === "object" && toolData !== null
					? (toolData as { summary?: unknown; content?: unknown })
					: undefined;

			ordered.push({
				type: "tool",
				toolName: toolMsg.name || "unknown",
				runId: toolMsg.tool_call_id,
				args: toolCallIdToArgs.get(toolMsg.tool_call_id) ?? {},
				data: toolData,
				content:
					typeof toolDataRecord?.summary === "string"
						? toolDataRecord.summary
						: typeof toolDataRecord?.content === "string"
							? toolDataRecord.content
							: JSON.stringify(toolData),
				status: "success",
			});
		}
	}

	return ordered;
}
