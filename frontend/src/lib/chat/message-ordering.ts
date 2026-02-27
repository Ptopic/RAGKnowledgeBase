import type { AIMessage, Message, ToolMessage } from "@langchain/core/messages";
import { messageContentToText } from "@/lib/chat/message-adapter";
import type { OrderedStreamMessage } from "@/types/chat.types";

export function getOrderedMessages(
	messages: Message[],
): OrderedStreamMessage[] {
	const ordered: OrderedStreamMessage[] = [];

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
			});
		} else if (msg.type === "tool") {
			const toolMsg = msg as ToolMessage;

			// Skip tool messages with errors - don't save/display them
			if (toolMsg.status === "error") {
				continue;
			}

			if (!toolMsg.tool_call_id) continue;

			// Parse tool content (can be string or object)
			let toolData: any;
			if (typeof toolMsg.content === "string") {
				try {
					toolData = JSON.parse(toolMsg.content);
				} catch {
					toolData = { content: toolMsg.content };
				}
			} else {
				toolData = toolMsg.content;
			}

			ordered.push({
				type: "tool",
				toolName: toolMsg.name || "unknown",
				runId: toolMsg.tool_call_id,
				data: toolData,
				content: toolData?.summary || toolData?.content || JSON.stringify(toolData),
				status: "success",
			});
		}
	}

	return ordered;
}
