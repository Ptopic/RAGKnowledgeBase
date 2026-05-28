import type {
	SourceMessagePart,
	ThreadAssistantMessagePart,
	ThreadMessageLike,
	ThreadUserMessagePart,
	ToolCallMessagePart,
} from "@assistant-ui/react";
import type { BaseMessage, ContentBlock } from "@langchain/core/messages";

function getTextFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";

	return content
		.filter(
			(part): part is ContentBlock.Text =>
				typeof part === "object" &&
				part !== null &&
				"type" in part &&
				part.type === "text" &&
				"text" in part &&
				typeof part.text === "string",
		)
		.map((part) => part.text)
		.join("");
}

function safeJsonStringify(value: unknown) {
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		return String(value);
	}
}

function toReadonlyJsonObject(value: unknown): ToolCallMessagePart["args"] {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}
	try {
		return JSON.parse(JSON.stringify(value)) as ToolCallMessagePart["args"];
	} catch {
		return {};
	}
}

function toToolResult(content: unknown, artifact?: unknown): unknown {
	if (artifact !== undefined) return artifact;

	const text = getTextFromContent(content).trim();
	if (!text) return undefined;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function toUserThreadContent(
	content: string | ContentBlock[],
): ThreadUserMessagePart[] {
	const parts: ThreadUserMessagePart[] = [];

	if (typeof content === "string") {
		const text = content.trim();
		parts.push({ text: text || "", type: "text" as const });
	} else if (Array.isArray(content)) {
		for (const block of content) {
			if (
				typeof block === "object" &&
				block !== null &&
				"type" in block
			) {
				if (
					block.type === "text" &&
					"text" in block &&
					typeof block.text === "string" &&
					block.text.trim().length > 0
				) {
					parts.push({ text: block.text, type: "text" as const });
				} else if (block.type === "image_url") {
					const imageUrl =
						typeof (block as Record<string, unknown>).image_url === "string"
							? (block as Record<string, unknown>).image_url as string
							: ((block as Record<string, unknown>).image_url as Record<string, unknown>)?.url;
					if (typeof imageUrl === "string" && imageUrl.length > 0) {
						parts.push({ type: "image" as const, image: imageUrl });
					}
				}
			}
		}
	}

	if (parts.length === 0) {
		parts.push({ text: "", type: "text" as const });
	}

	return parts;
}

type LangChainToolCall = {
	id?: string;
	name: string;
	args: Record<string, unknown>;
};

type LangChainToolMessage = BaseMessage & {
	type: "tool";
	artifact?: unknown;
	status?: "success" | "error";
	tool_call_id: string;
};

function isLangChainToolMessage(
	message: BaseMessage,
): message is LangChainToolMessage {
	return message.type === "tool" && "tool_call_id" in message;
}

function isLangChainToolCall(value: unknown): value is LangChainToolCall {
	return (
		typeof value === "object" &&
		value !== null &&
		"name" in value &&
		typeof value.name === "string" &&
		"args" in value &&
		typeof value.args === "object" &&
		value.args !== null
	);
}

function toAssistantThreadContent(
	message: BaseMessage,
): ThreadAssistantMessagePart[] {
	const parts: ThreadAssistantMessagePart[] = [];

	const content = (message as BaseMessage & { contentBlocks?: unknown[] })
		.contentBlocks;

	if (Array.isArray(content)) {
		for (const part of content) {
			if (typeof part !== "object" || part === null || !("type" in part)) continue;

			if (
				part.type === "text" &&
				"text" in part &&
				typeof part.text === "string"
			) {
				if (part.text.trim().length > 0) {
					parts.push({ text: part.text, type: "text" });
				}
				continue;
			}

			if (
				part.type === "reasoning" &&
				"reasoning" in part &&
				typeof part.reasoning === "string" &&
				part.reasoning.trim().length > 0
			) {
				parts.push({ text: part.reasoning, type: "reasoning" });
				continue;
			}

			if (
				part.type === "tool_call" &&
				"name" in part &&
				typeof part.name === "string"
			) {
				parts.push({
					args: toReadonlyJsonObject("args" in part ? part.args : {}),
					argsText: safeJsonStringify("args" in part ? part.args : {}),
					toolCallId:
						typeof part.id === "string"
							? part.id
							: `${message.id ?? "ai"}-${parts.length}`,
					toolName: part.name,
					type: "tool-call",
				});
			}
		}
	}

	const hasReasoningPart = parts.some((part) => part.type === "reasoning");
	if (!hasReasoningPart) {
		const reasoningObj = (
			message as BaseMessage & {
				additional_kwargs?: { reasoning?: { summary?: Array<{ text?: unknown }> } };
			}
		).additional_kwargs?.reasoning;
		if (reasoningObj && Array.isArray(reasoningObj.summary)) {
			const reasoningText = reasoningObj.summary
				.map((summaryPart) => summaryPart.text)
				.filter(
					(text): text is string =>
						typeof text === "string" && text.trim().length > 0,
				)
				.join("\n");

			if (reasoningText.trim().length > 0) {
				parts.unshift({ text: reasoningText, type: "reasoning" });
			}
		}
	}

	const toolCalls = "tool_calls" in message ? message.tool_calls : undefined;
	if (Array.isArray(toolCalls)) {
		const existingIds = new Set(
			parts
				.filter(
					(part): part is ToolCallMessagePart => part.type === "tool-call",
				)
				.map((part) => part.toolCallId),
		);

		for (let index = 0; index < toolCalls.length; index += 1) {
			const toolCall = toolCalls[index];
			if (!isLangChainToolCall(toolCall)) continue;

			const toolCallId = toolCall.id ?? `${message.id ?? "ai"}-tool-${index}`;
			if (existingIds.has(toolCallId)) continue;

			parts.push({
				args: toReadonlyJsonObject(toolCall.args),
				argsText: safeJsonStringify(toolCall.args),
				toolCallId,
				toolName: toolCall.name,
				type: "tool-call",
			});
		}
	}

	const hasVisibleTextPart = parts.some((part) => part.type === "text");
	if (!hasVisibleTextPart) {
		const rawText = getTextFromContent(message.content).trim();
		if (rawText && !rawText.startsWith("{") && !rawText.startsWith("[")) {
			parts.unshift({ text: rawText, type: "text" });
		}
	}

	if (parts.length === 0) {
		const text = getTextFromContent(message.content).trim();
		if (text && !text.startsWith("{") && !text.startsWith("[")) {
			parts.push({ text, type: "text" });
		}
	}

	return parts;
}

	type SourceMetadataItem = {
		id: string;
		title: string;
		url: string;
		type: string;
		ogImage?: string;
	};

	function extractSourcesFromToolResult(
		parsedResult: unknown,
	): ThreadAssistantMessagePart[] {
		if (!parsedResult) return [];

		const resultObj =
			typeof parsedResult === "string"
				? (() => {
						try {
							return JSON.parse(parsedResult);
						} catch {
							return null;
						}
					})()
				: parsedResult;

		if (!resultObj || typeof resultObj !== "object" || !("sources" in resultObj))
			return [];

		const sources = (resultObj as { sources: unknown }).sources;
		if (!Array.isArray(sources)) return [];

		const sourceParts: ThreadAssistantMessagePart[] = [];

		for (const src of sources) {
			if (!src || typeof src !== "object") continue;
			const s = src as SourceMetadataItem;
			const sourceId = s.id ?? `source-${Math.random().toString(36).slice(2)}`;

			const isDocument = s.type === "FILE" || s.type === "UNKNOWN";
			sourceParts.push({
				type: "source",
				sourceType: isDocument ? "document" : "url",
				id: sourceId,
				url: s.url ?? "",
				title: s.title,
			} as ThreadAssistantMessagePart);
		}

		return sourceParts;
	}

function attachToolResult(
	threadMessages: ThreadMessageLike[],
	toolMessage: LangChainToolMessage,
) {
	for (let index = threadMessages.length - 1; index >= 0; index -= 1) {
		const message = threadMessages[index];
		if (
			!message ||
			message.role !== "assistant" ||
			!Array.isArray(message.content)
		)
			continue;

		const hasMatch = message.content.some(
			(part): part is ToolCallMessagePart =>
				part.type === "tool-call" &&
				part.toolCallId === toolMessage.tool_call_id,
		);

		if (!hasMatch) continue;

		const parsedResult = toToolResult(
			toolMessage.content,
			toolMessage.artifact,
		);

		const sourceParts = extractSourcesFromToolResult(
			parsedResult,
		);

		const updatedContent = [
			...message.content.map((part): typeof part => {
				if (
					part.type !== "tool-call" ||
					part.toolCallId !== toolMessage.tool_call_id
				) {
					return part;
				}

				return {
					...part,
					isError: toolMessage.status === "error",
					result: parsedResult,
				};
			}),
			...sourceParts,
		];

		threadMessages[index] = { ...message, content: updatedContent };
		return;
	}

	const toolName = (toolMessage as BaseMessage & { name?: unknown }).name;
	if (typeof toolName === "string") {
		const parsedResult = toToolResult(toolMessage.content, toolMessage.artifact);
		const syntheticPart: ToolCallMessagePart = {
			type: "tool-call",
			toolCallId: toolMessage.tool_call_id,
			toolName,
			args: {},
			argsText: "",
			result: parsedResult,
			isError: toolMessage.status === "error",
		};

		const lastAssistantIdx = threadMessages.reduce(
			(acc, message, idx) => (message.role === "assistant" ? idx : acc),
			-1,
		);

		if (lastAssistantIdx !== -1) {
			threadMessages[lastAssistantIdx] = {
				...threadMessages[lastAssistantIdx],
				content: [
					...(threadMessages[lastAssistantIdx]
						.content as ThreadAssistantMessagePart[]),
					syntheticPart,
				],
			};
		} else {
			threadMessages.push({
				role: "assistant",
				content: [syntheticPart],
			});
		}
	}
}

function mergeConsecutiveAssistantMessages(
	messages: ThreadMessageLike[],
): ThreadMessageLike[] {
	const merged: ThreadMessageLike[] = [];

		for (const msg of messages) {
			const last = merged[merged.length - 1];

			if (last && last.role === "assistant" && msg.role === "assistant") {
				const lastContent = Array.isArray(last.content) ? last.content : [];
				const msgContent = Array.isArray(msg.content) ? msg.content : [];
				merged[merged.length - 1] = {
					...last,
					content: [...lastContent, ...msgContent],
				};
			} else {
				const nextContent = Array.isArray(msg.content) ? [...msg.content] : msg.content;
				merged.push({ ...msg, content: nextContent });
			}
		}

		for (const msg of merged) {
			if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;
			const sources = msg.content.filter(
				(p): p is SourceMessagePart => p.type === "source",
			);
			if (sources.length === 0) continue;
			const rest = msg.content.filter((p) => p.type !== "source");
			const seenIds = new Set<string>();
			const uniqueSources = sources.filter((s) => {
				if (seenIds.has(s.id)) return false;
				seenIds.add(s.id);
				return true;
			});
			msg.content = [...rest, ...uniqueSources];
		}

		return merged;
}

export function toThreadMessages(
	messages: readonly BaseMessage[],
): ThreadMessageLike[] {
	const threadMessages: ThreadMessageLike[] = [];

	for (let index = 0; index < messages.length; index += 1) {
		const message = messages[index] as BaseMessage;
		const fallbackId = `${message.type}-${index}`;
		const messageId = message.id ?? fallbackId;

		if (message.type === "human") {
			const allContent = toUserThreadContent(message.content);
			const imageParts = allContent.filter(
				(part): part is { type: "image"; image: string } =>
					part.type === "image" && typeof part.image === "string",
			);
			// Images render via UserMessageAttachments only, not inline in the bubble
			const content = allContent.filter((part) => part.type !== "image");

			threadMessages.push({
				content,
				id: messageId,
				role: "user",
				...(imageParts.length > 0 && {
					attachments: imageParts.map((part, i) => ({
						id: `${messageId}-attachment-${i}`,
						type: "image" as const,
						name: `image-${i + 1}`,
						content: [{ type: "image" as const, image: part.image }],
						status: { type: "complete" as const },
					})),
				}),
			});
			continue;
		}

		if (isLangChainToolMessage(message)) {
			attachToolResult(threadMessages, message);
			continue;
		}

		if (message.type === "system") continue;
		if (message.type !== "ai") continue;

		const content = toAssistantThreadContent(message);
		if (content.length === 0) continue;

		threadMessages.push({
			content,
			id: messageId,
			role: "assistant",
		});
	}

	return mergeConsecutiveAssistantMessages(threadMessages);
}

export function toLangGraphMessageContent(
	parts: readonly { type: string; text?: string; image?: string }[],
):
	| string
	| Array<
			| { text: string; type: "text" }
			| { image_url: { url: string }; type: "image_url" }
	  >
	| null {
	const content: Array<
		| { text: string; type: "text" }
		| { image_url: { url: string }; type: "image_url" }
	> = [];

	for (const part of parts) {
		if (part.type === "text" && part.text?.trim()) {
			content.push({ text: part.text, type: "text" });
			continue;
		}

		if (part.type === "image" && part.image) {
			content.push({ image_url: { url: part.image }, type: "image_url" });
		}
	}

	if (content.length === 0) return null;
	if (content.length === 1 && content[0]?.type === "text") {
		return content[0].text;
	}

	return content;
}
