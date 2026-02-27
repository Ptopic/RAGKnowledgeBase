import { useMemo } from "react";
import type { AIMessage, Message } from "@langchain/core/messages";
import type { ToolCallState } from "./use-chat-stream";
import { messageContentToText, parsePersistedMessage } from "@/lib/chat/message-adapter";

export function useRestoredToolCalls(messages: Message[]) {
	return useMemo(() => {
		const toolCallsByMessage = new Map<Message, ToolCallState[]>();

		for (const message of messages) {
			if (message.type === "ai") {
				const aiMessage = message as AIMessage;
				const content = messageContentToText(aiMessage.content);
				const { isToolCall, parsedContent } = parsePersistedMessage(content);

				if (isToolCall && parsedContent) {
					const toolCall: ToolCallState = {
						toolCall: {
							id: parsedContent.runId,
							name: parsedContent.toolName,
							args: parsedContent.args ?? {},
						},
						toolMessage: undefined,
						errored: parsedContent.status === "error",
					};

					toolCallsByMessage.set(message, [toolCall]);
				}
			}
		}

		return toolCallsByMessage;
	}, [messages]);
}
