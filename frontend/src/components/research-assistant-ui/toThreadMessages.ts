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

const DOCUMENT_MARKER_REGEX = /\[uploaded_document:\s*\{.*?\}\]\s*/g;

function stripDocumentMarkers(text: string): string {
	return text.replace(DOCUMENT_MARKER_REGEX, "").trim();
}

function extractDocumentMarkers(text: string): Array<{ filePath: string; fileName: string }> {
	const docs: Array<{ filePath: string; fileName: string }> = [];
	let match: RegExpExecArray | null;
	const regex = /\[uploaded_document:\s*(\{.*?\})\]/g;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop pattern
	while ((match = regex.exec(text)) !== null) {
		try {
			const parsed = JSON.parse(match[1]);
			if (parsed.filePath && parsed.fileName) {
				docs.push({ filePath: parsed.filePath, fileName: parsed.fileName });
			}
		} catch {
			// skip malformed markers
		}
	}
	return docs;
}

function toUserThreadContent(
	content: string | ContentBlock[],
): { parts: ThreadUserMessagePart[]; documents: Array<{ filePath: string; fileName: string }> } {
	const parts: ThreadUserMessagePart[] = [];
	const documents: Array<{ filePath: string; fileName: string }> = [];

	if (typeof content === "string") {
		const text = stripDocumentMarkers(content).trim();
		documents.push(...extractDocumentMarkers(content));
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
					const stripped = stripDocumentMarkers(block.text);
					documents.push(...extractDocumentMarkers(block.text));
					if (stripped.trim().length > 0) {
						parts.push({ text: stripped, type: "text" as const });
					}
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

	return { parts, documents };
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

type QuestionFlowData = {
	questions: Array<{ text: string; options: string[]; multiple?: boolean }>;
	answer?: string;
};

function normalizeQuestionFlow(message: BaseMessage): QuestionFlowData | null {
	const fromFlow = message.additional_kwargs?.questionFlow;
	if (
		fromFlow &&
		typeof fromFlow === "object" &&
		Array.isArray((fromFlow as { questions?: unknown }).questions)
	) {
		const questions = (fromFlow as { questions: unknown[] }).questions
			.map((question) => {
				if (typeof question !== "object" || question === null) return null;
				const record = question as {
					text?: unknown;
					options?: unknown;
					multiple?: unknown;
				};
				if (typeof record.text !== "string") return null;
				if (!Array.isArray(record.options)) return null;
				const options = record.options.filter(
					(option): option is string => typeof option === "string",
				);
				if (options.length === 0) return null;
				return {
					multiple: Boolean(record.multiple),
					options,
					text: record.text,
				};
			})
			.filter(
				(
					question,
				): question is {
					text: string;
					options: string[];
					multiple?: boolean;
				} => question !== null,
			);

		if (questions.length > 0) {
			return {
				answer:
					typeof (fromFlow as { answer?: unknown }).answer === "string"
						? (fromFlow as { answer: string }).answer
						: undefined,
				questions,
			};
		}
	}

	const questionData = message.additional_kwargs?.question;
	if (
		questionData &&
		typeof questionData === "object" &&
		"text" in questionData &&
		typeof questionData.text === "string"
	) {
		const answeredQuestion = message.additional_kwargs?.answeredQuestion;
		return {
			answer:
				answeredQuestion &&
				typeof answeredQuestion === "object" &&
				"answer" in answeredQuestion &&
				typeof answeredQuestion.answer === "string"
					? answeredQuestion.answer
					: undefined,
			questions: [
				{
					multiple: false,
					options: Array.isArray(
						(questionData as { options?: unknown }).options,
					)
						? (questionData as { options: unknown[] }).options.filter(
								(option): option is string => typeof option === "string",
							)
						: [],
					text: questionData.text,
				},
			],
		};
	}

	return null;
}

function isLangChainToolMessage(
	message: BaseMessage,
): message is LangChainToolMessage {
	return message.type === "tool" && "tool_call_id" in message;
}

function toAssistantThreadContent(
	message: BaseMessage,
): ThreadAssistantMessagePart[] {
	const parts: ThreadAssistantMessagePart[] = [];

	const content = (message as any).contentBlocks ?? [];

	for (const part of content) {
		if (typeof part !== "object" || part === null || !("type" in part))
			continue;

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

	// Responses API puts reasoning in additional_kwargs.reasoning.summary
	const hasReasoningPart = parts.some((part) => part.type === "reasoning");
	if (!hasReasoningPart) {
		const reasoningObj = message.additional_kwargs?.reasoning;
		if (
			reasoningObj &&
			typeof reasoningObj === "object" &&
			Array.isArray(reasoningObj.summary)
		) {
			const reasoningText = reasoningObj.summary
				.map((s: any) => s.text)
				.filter((t: any) => typeof t === "string" && t.trim().length > 0)
				.join("\n");
			if (reasoningText.trim().length > 0) {
				parts.unshift({ text: reasoningText, type: "reasoning" });
			}
		}
	}

	const questionFlow = normalizeQuestionFlow(message);
	if (questionFlow) {
		const askUserToolCallId = `ask-user-${message.id ?? "ai"}`;
		const hasAskUserToolPart = parts.some(
			(part): part is ToolCallMessagePart =>
				part.type === "tool-call" && part.toolName === "ask_user",
		);

		if (!hasAskUserToolPart) {
			parts.push({
				args: {
					questions: questionFlow.questions,
				},
				argsText: safeJsonStringify({
					questions: questionFlow.questions,
				}),
				toolCallId: askUserToolCallId,
				toolName: "ask_user",
				type: "tool-call",
			});
		}

		parts.push({
			type: "data",
			name: "question",
			data: {
				answer: questionFlow.answer,
				questions: questionFlow.questions,
			},
		});

		if (questionFlow.answer) {
			const askUserToolPartIndex = parts.findIndex(
				(part): part is ToolCallMessagePart =>
					part.type === "tool-call" && part.toolName === "ask_user",
			);
			if (askUserToolPartIndex !== -1) {
				parts[askUserToolPartIndex] = {
					...parts[askUserToolPartIndex],
					result: questionFlow.answer,
				};
			}
		}
	}

	// Also handle tool_calls from the message (for messages without contentBlocks)
	const toolCalls = "tool_calls" in message ? message.tool_calls : undefined;
	if (Array.isArray(toolCalls)) {
		const existingIds = new Set(
			parts
				.filter(
					(part): part is ToolCallMessagePart => part.type === "tool-call",
				)
				.map((part) => part.toolCallId),
		);

		for (const [index, toolCall] of toolCalls.entries()) {
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

	// Preserve assistant plain-text content even when tool-call parts exist.
	// Some streamed snapshots include tool_call blocks but keep human-readable
	// confirmation only in message.content; without this, confirmation text can
	// appear to be "overwritten" by tool-call rendering.
	const hasVisibleTextPart = parts.some((part) => part.type === "text");
	if (!hasVisibleTextPart) {
		const rawText = getTextFromContent(message.content).trim();
		if (rawText && !rawText.startsWith("{") && !rawText.startsWith("[")) {
			parts.unshift({ text: rawText, type: "text" });
		}
	}

	// Fallback: if no contentBlocks and no tool_calls, use raw content as text
	if (parts.length === 0) {
		const text = getTextFromContent(message.content).trim();
		if (text) {
			// Skip JSON control messages (e.g. question JSON)
			if (!text.startsWith("{") && !text.startsWith("[")) {
				parts.push({ text, type: "text" });
			}
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
		seenSourceIds: Set<string>,
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
			if (seenSourceIds.has(sourceId)) continue;
			seenSourceIds.add(sourceId);

			const isDocument = s.type === "FILE" || !s.url;
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
	const allToolCallIds = threadMessages.flatMap((m) =>
		m.role === "assistant" && Array.isArray(m.content)
			? m.content
					.filter((p): p is ToolCallMessagePart => p.type === "tool-call")
					.map((p) => `${p.toolCallId}:${p.toolName}`)
			: [],
	);

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

		const matchingPart = message.content.find(
			(p): p is ToolCallMessagePart =>
				p.type === "tool-call" &&
				p.toolCallId === toolMessage.tool_call_id,
		);

		const sourceParts = extractSourcesFromToolResult(
			parsedResult,
			seenSourceIds,
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

	// Fallback: no matching tool-call part found. Create a synthetic one
	// with the result already attached. This handles the case where the AI
	// message containing the tool call was lost during stream accumulation
	// (e.g., ID collision causing a later text-only AI message to replace
	// the tool-calling AI message in the client-side accumulatedMessages).
	const toolName = (toolMessage as any).name;
	if (typeof toolName === "string") {
		const parsedResult = toToolResult(
			toolMessage.content,
			toolMessage.artifact,
		);
		const syntheticPart: ToolCallMessagePart = {
			type: "tool-call",
			toolCallId: toolMessage.tool_call_id,
			toolName,
			args: {},
			argsText: "",
			result: parsedResult,
			isError: toolMessage.status === "error",
		};

		// Add to the last assistant message so it merges correctly
		// with consecutive assistant messages in mergeConsecutiveAssistantMessages.
		const lastAssistantIdx = threadMessages.reduce(
			(acc, m, i) => (m.role === "assistant" ? i : acc),
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

export function toThreadMessages(
	messages: readonly BaseMessage[],
): ThreadMessageLike[] {
	const threadMessages: ThreadMessageLike[] = [];
	const seenSourceIds = new Set<string>();

	for (const [index, message] of messages.entries()) {
		const fallbackId = `${message.type}-${index}`;
		const messageId = message.id ?? fallbackId;

		if (message.type === "human") {
			const { parts: allContent, documents: docEntries } = toUserThreadContent(message.content);
			const imageParts = allContent.filter(
				(part): part is { type: "image"; image: string } =>
					part.type === "image" && typeof part.image === "string",
			);
			const content = allContent.filter((part) => part.type !== "image");

			const attachments: Array<{
				id: string;
				type: "image" | "document";
				name: string;
				content: ThreadUserMessagePart[];
				status: { type: "complete" };
			}> = [];

			for (let i = 0; i < imageParts.length; i++) {
				attachments.push({
					id: `${messageId}-attachment-img-${i}`,
					type: "image",
					name: `image-${i + 1}`,
					content: [{ type: "image" as const, image: imageParts[i].image }],
					status: { type: "complete" as const },
				});
			}

			for (let i = 0; i < docEntries.length; i++) {
				attachments.push({
					id: `${messageId}-attachment-doc-${i}`,
					type: "document",
					name: docEntries[i].fileName,
					content: [{ type: "text" as const, text: docEntries[i].fileName }],
					status: { type: "complete" as const },
				});
			}

			threadMessages.push({
				content,
				id: messageId,
				role: "user",
				...(attachments.length > 0 && { attachments }),
			});
			continue;
		}

		if (isLangChainToolMessage(message)) {
			attachToolResult(threadMessages, message);
			continue;
		}

		if (message.type === "system") {
			continue;
		}

		if (message.type !== "ai") {
			continue;
		}

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

function mergeConsecutiveAssistantMessages(
	messages: ThreadMessageLike[],
): ThreadMessageLike[] {
	const merged: ThreadMessageLike[] = [];

	for (const msg of messages) {
		const last = merged[merged.length - 1];

		if (last && last.role === "assistant" && msg.role === "assistant") {
			last.content = [...last.content, ...msg.content];
		} else {
			merged.push({ ...msg, content: [...msg.content] });
		}
	}

	for (const msg of merged) {
		if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;
		const sources = msg.content.filter(
			(p): p is SourceMessagePart => p.type === "source",
		);
		if (sources.length === 0) continue;
		const rest = msg.content.filter((p) => p.type !== "source");
		msg.content = [...rest, ...sources];
	}

	return merged;
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
