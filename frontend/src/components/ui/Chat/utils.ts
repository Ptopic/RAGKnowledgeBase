import {
	AIMessage,
	type Message,
} from "@langchain/core/messages";
import type { OrderedStreamMessage } from "@/types/chat.types";

function isAIMessage(message: unknown): boolean {
	if (!message || typeof message !== "object") return false;
	const msg = message as Record<string, unknown>;
	if (msg.type === "ai") return true;
	return AIMessage.isInstance(message);
}

function extractTextContent(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.map((item) => {
				if (typeof item === "string") {
					return item;
				}
				if (item && typeof item === "object" && "text" in item) {
					return String((item as { text?: unknown }).text);
				}
				return "";
			})
			.join("");
	}

	if (content && typeof content === "object" && "text" in content) {
		return String((content as { text?: unknown }).text);
	}

	return String(content || "");
}

function isJsonControlMessage(content: unknown): boolean {
	if (typeof content === "string") {
		return content.trim().startsWith("{");
	}
	if (Array.isArray(content)) {
		const textBlocks = content.filter(
			(block) =>
				typeof block === "object" &&
				block !== null &&
				(block as { type?: unknown }).type === "text" &&
				typeof (block as { text?: unknown }).text === "string",
		);
		if (textBlocks.length === 0) return false;
		return textBlocks.every((block) =>
			((block as { text: string }).text || "").trim().startsWith("{"),
		);
	}
	return false;
}

export function getOrderedMessages(
	messages: Message[],
): OrderedStreamMessage[] {
	const orderedMessages: OrderedStreamMessage[] = [];
	const persistedAskUserRunIds = new Set<string>();

	const toolCallIdToName = new Map<string, string>();
	for (const msg of messages) {
		if (msg.type === "ai" && isAIMessage(msg as AIMessage)) {
			const aiMsg = msg as AIMessage;

			if (Array.isArray(aiMsg.tool_calls)) {
				for (const tc of aiMsg.tool_calls) {
					if (tc.id && tc.name) {
						toolCallIdToName.set(tc.id, tc.name);
					}
				}
			}

			const contentBlocks = (aiMsg as AIMessage & { contentBlocks?: unknown[] })
				.contentBlocks;
			if (Array.isArray(contentBlocks)) {
				for (const block of contentBlocks) {
					if (
						typeof block === "object" &&
						block !== null &&
						(block as { type?: unknown }).type === "tool_call" &&
						typeof (block as { id?: unknown }).id === "string" &&
						typeof (block as { name?: unknown }).name === "string"
					) {
						toolCallIdToName.set(
							(block as { id: string }).id,
							(block as { name: string }).name,
						);
					}
				}
			}
		}
	}

	for (const msg of messages) {
		if (msg.type === "ai" && isAIMessage(msg as AIMessage) && msg.content) {
			const textContent = extractTextContent(msg.content);
			const aiMsg = msg as AIMessage;
			const questionFlow = aiMsg.additional_kwargs?.questionFlow;
			const questionData = aiMsg.additional_kwargs?.question;

			const hasQuestionFlow =
				questionFlow &&
				typeof questionFlow === "object" &&
				Array.isArray((questionFlow as { questions?: unknown }).questions);
			const hasLegacyQuestion =
				questionData &&
				typeof questionData === "object" &&
				"text" in questionData;

			if (hasQuestionFlow || hasLegacyQuestion) {
				const runId =
					typeof aiMsg.id === "string" && aiMsg.id.length > 0
						? `ask-user-${aiMsg.id}`
						: `ask-user-${orderedMessages.length}`;

				if (!persistedAskUserRunIds.has(runId)) {
					persistedAskUserRunIds.add(runId);

					const normalizedData = hasQuestionFlow
						? questionFlow
						: {
								questions: [
									{
										multiple: false,
										options: Array.isArray(
											(questionData as { options?: unknown }).options,
										)
											? (questionData as { options: string[] }).options
											: [],
										text: String(
											(questionData as { text?: unknown }).text ?? "",
										),
									},
								],
							};

					orderedMessages.push({
						content: "Requesting approval to ask_user.",
						data: normalizedData,
						runId,
						status: "success",
						toolName: "ask_user",
						type: "tool",
					});
				}
			}

			if (textContent.trim().length > 0 && !isJsonControlMessage(msg.content)) {
				orderedMessages.push({
					type: "ai",
					content: textContent,
				});
			}
		}
	}

	return orderedMessages;
}
