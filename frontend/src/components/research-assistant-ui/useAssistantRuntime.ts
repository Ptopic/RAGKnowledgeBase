"use client";

import {
	fromThreadMessageLike,
	getAutoStatus,
} from "@assistant-ui/core/internal";
import {
	type AppendMessage,
	CompositeAttachmentAdapter,
	ExportedMessageRepository,
	SimpleImageAttachmentAdapter,
	SimpleTextAttachmentAdapter,
	type ThreadMessageLike,
	useExternalStoreRuntime,
	WebSpeechDictationAdapter,
} from "@assistant-ui/react";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
	FetchStreamTransport,
	useStream,
} from "@langchain/langgraph-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	toLangGraphMessageContent,
	toThreadMessages,
} from "@/components/research-assistant-ui/toThreadMessages";
import { getOrderedMessages } from "@/components/ui/Chat/utils";
import { config } from "@/shared/config/config";
import type { OrderedStreamMessage } from "@/types/chat.types";

	const attachmentAdapter = new CompositeAttachmentAdapter([
		new SimpleImageAttachmentAdapter(),
		new SimpleTextAttachmentAdapter(),
	]);

export interface UseAssistantRuntimeOptions {
	endpoint: string;
	threadId: string;
	userId: number;
	token?: string;
	searchSpaceId: string;
	selectedConnectors?: string[];
	selectedDocumentIds?: number[];
	chatId?: number;
	articleId?: number;
	aiChatMode?: string;
	articleContent?: { title: string; ingress: string; content: string };
	initialMessages?: BaseMessage[];
	onChatCreated?: (chatId: number) => void;
	onStreamFinish?: (
		orderedMessages: OrderedStreamMessage[],
		userMessage: string,
	) => void;
	onStreamError?: (error: Error | string) => void;
	onToolComplete?: (toolName: string) => void;
	resetVersion?: number;
	shareView?: boolean;
}

type PendingQuestionItem = {
	text: string;
	options: string[];
	multiple?: boolean;
};

type PendingQuestionFlow = {
	questions: PendingQuestionItem[];
	answer?: string;
};

export function useAssistantRuntime(options: UseAssistantRuntimeOptions) {
	const effectiveEndpoint = options.shareView ? "about:blank" : options.endpoint;

	const [currentChatId, setCurrentChatId] = useState<number | undefined>(
		options.chatId,
	);
	const currentChatIdRef = useRef<number | undefined>(options.chatId);
	const lastUserMessageRef = useRef<string>("");
	const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-sync when chatId prop changes
	useEffect(() => {
		if (options.chatId !== currentChatId) {
			setCurrentChatId(options.chatId);
			currentChatIdRef.current = options.chatId;
		}
	}, [options.chatId]);

	useEffect(() => {
		currentChatIdRef.current = currentChatId;
	}, [currentChatId]);

	// accumulatedMessages: custom backends using streamMode: ["messages"] only
	// return AI/tool tokens for the current turn. We accumulate the full
	// conversation client-side so assistant-ui can render the complete thread.
	const [accumulatedMessages, setAccumulatedMessages] = useState<BaseMessage[]>(
		options.initialMessages ?? [],
	);
	const accumulatedMessagesRef = useRef<BaseMessage[]>(
		options.initialMessages ?? [],
	);

	useEffect(() => {
		accumulatedMessagesRef.current = accumulatedMessages;
	}, [accumulatedMessages]);

	const completedToolCallIdsRef = useRef<Set<string>>(new Set());
	const initialMessagesLoadedRef = useRef(false);
	const mergedStreamIdsRef = useRef<Set<string>>(new Set());
	const turnStartIndexRef = useRef<number | null>(null);

	useEffect(() => {
		const initial = options.initialMessages;
		if (initial && initial.length > 0 && !initialMessagesLoadedRef.current) {
			initialMessagesLoadedRef.current = true;
			setAccumulatedMessages(initial);
		}
	}, [options.initialMessages]);

	useEffect(() => {
		if (options.resetVersion === undefined) return;
		const initial = options.initialMessages ?? [];
		initialMessagesLoadedRef.current = true;
		setAccumulatedMessages(initial);
		mergedStreamIdsRef.current.clear();
		completedToolCallIdsRef.current.clear();
		setPendingQuestion(null);
		setStreamError(null);
		setFollowUpQuestions([]);
		turnStartIndexRef.current = null;
	}, [options.resetVersion, options.initialMessages]);

	const transport = useMemo(
		() =>
			new FetchStreamTransport({
				apiUrl: effectiveEndpoint,
				fetch: async (url: string, init?: RequestInit) => {
					const headers = new Headers(init?.headers);
					if (options.token) {
						headers.set("Authorization", `Bearer ${options.token}`);
					}

					const response = await fetch(url, {
						...init,
						headers,
					});
					const chatIdHeader = response.headers.get("X-Chat-Id");
					if (chatIdHeader && !currentChatIdRef.current) {
						const newChatId = parseInt(chatIdHeader, 10);
						currentChatIdRef.current = newChatId;
						setCurrentChatId(newChatId);
						options.onChatCreated?.(newChatId);
					}
					return response;
				},
				onRequest: async (_url: string, init: RequestInit) => {
					const langchainBody = JSON.parse(init.body as string) || {};
					const messages = langchainBody.messages || langchainBody.input?.messages || [];
					const lastMessage = messages[messages.length - 1];
					const messageContent = lastMessage?.content || "";

					lastUserMessageRef.current = typeof messageContent === "string"
						? messageContent
						: (Array.isArray(messageContent)
								? messageContent
										.filter((p: any) => p?.type === "text" && typeof p?.text === "string")
										.map((p: any) => p.text as string)
										.join(" ")
								: String(messageContent));

					const customBody = {
						messages: [{ content: messageContent, role: "user" }],
						chat_id: currentChatIdRef.current,
						data: {
							search_space_id: options.searchSpaceId,
							research_mode: "QNA",
							selected_connectors: options.selectedConnectors,
							document_ids_to_add_in_context: options.selectedDocumentIds,
							search_mode: "CHUNKS",
						},
					};

					return {
						...init,
						body: JSON.stringify(customBody),
					};
				},
			}),
		[
			effectiveEndpoint,
			options.token,
			options.searchSpaceId,
			options.selectedConnectors,
			options.selectedDocumentIds,
			options.onChatCreated,
		],
	);

	const [streamError, setStreamError] = useState<unknown>(null);
	const [pendingQuestion, setPendingQuestion] =
		useState<PendingQuestionFlow | null>(null);
	const pendingQuestionRef = useRef<PendingQuestionFlow | null>(null);

	useEffect(() => {
		pendingQuestionRef.current = pendingQuestion;
	}, [pendingQuestion]);

	const stream = useStream({
		transport,
		threadId: options.threadId,
		onError: (error) => {
			setStreamError(error);
			options.onStreamError?.(
				error instanceof Error ? error : new Error(String(error)),
			);
		},
		onCustomEvent: (data: any) => {
			if (data?.type === "question") {
				const normalizedQuestions: PendingQuestionItem[] = Array.isArray(
					data?.questions,
				)
					? data.questions
							.map((question: any) => {
								const text =
									typeof question?.text === "string" &&
									question.text.trim().length > 0
										? question.text.trim()
										: "";
								const options = Array.isArray(question?.options)
									? question.options.filter(
											(option: unknown): option is string =>
												typeof option === "string" && option.trim().length > 0,
										)
									: [];
								if (!text || options.length === 0) return null;
								return {
									multiple: Boolean(question?.multiple),
									options,
									text,
								};
							})
							.filter(
								(
									value: PendingQuestionItem | null,
								): value is PendingQuestionItem => value !== null,
							)
					: [];

				if (normalizedQuestions.length === 0 && Array.isArray(data?.options)) {
					const fallbackText =
						typeof data.text === "string" && data.text.trim().length > 0
							? data.text.trim()
							: "Please choose one of the options below.";
					normalizedQuestions.push({
						multiple: Boolean(data?.multiple),
						options: data.options.filter(
							(option: unknown): option is string =>
								typeof option === "string" && option.trim().length > 0,
						),
						text: fallbackText,
					});
				}

				if (normalizedQuestions.length === 0) return;

				const questionFlow: PendingQuestionFlow = {
					questions: normalizedQuestions,
				};

				setPendingQuestion(questionFlow);

				setAccumulatedMessages((prev) => {
					const updated = [...prev];
					const lastAssistantIdx = updated.findLastIndex(
						(m) => m.type === "ai",
					);
					if (lastAssistantIdx === -1) {
						updated.push(
							new AIMessage({
								content: "",
								id: `${Date.now()}_question_anchor`,
								additional_kwargs: {
									questionFlow,
									question: {
										text: normalizedQuestions[0].text,
										options: normalizedQuestions[0].options,
									},
								},
							}),
						);
						return updated;
					}

					const lastAssistant = updated[lastAssistantIdx] as BaseMessage &
						Record<string, unknown>;
					const existingKwargs =
						typeof lastAssistant.additional_kwargs === "object" &&
						lastAssistant.additional_kwargs !== null
							? lastAssistant.additional_kwargs
							: {};

					updated[lastAssistantIdx] = {
						...lastAssistant,
						additional_kwargs: {
							...existingKwargs,
							questionFlow,
							question: {
								text: normalizedQuestions[0].text,
								options: normalizedQuestions[0].options,
							},
						},
					};

				return updated;
			});
			}

			if (
				data?.type === "follow_up_questions" &&
				Array.isArray(data?.questions)
			) {
				const questions = (data.questions as string[]).filter(
					(q: unknown): q is string =>
						typeof q === "string" && q.trim().length > 0,
				);
				setFollowUpQuestions(questions);
			}
		},
	});

	// Merge AI/tool messages from stream into accumulated state. Human messages
	// are added client-side in onNew(), so we skip them here. AI messages with
	// the same ID are updated in-place (content grows as tokens arrive).
	useEffect(() => {
		const streamMsgs = stream.messages as unknown as readonly BaseMessage[];
		if (streamMsgs.length === 0) return;

		setAccumulatedMessages((prev) => {
			const updated = [...prev];

			const hasTextBlock = (blocks: unknown): boolean => {
				if (!Array.isArray(blocks)) return false;
				return blocks.some(
					(block) =>
						typeof block === "object" &&
						block !== null &&
						"type" in block &&
						"text" in block &&
						(block as { type?: unknown }).type === "text" &&
						typeof (block as { text?: unknown }).text === "string" &&
						(block as { text: string }).text.trim().length > 0,
				);
			};

			const mergeStreamMessage = (
				existing: BaseMessage,
				incoming: BaseMessage,
			): BaseMessage => {
				const existingRecord = existing as BaseMessage &
					Record<string, unknown>;
				const incomingRecord = incoming as BaseMessage &
					Record<string, unknown>;
				const existingContentBlocks = existingRecord.contentBlocks;
				const incomingContentBlocks = incomingRecord.contentBlocks;

				const mergedContentBlocks = (() => {
					if (!Array.isArray(incomingContentBlocks))
						return existingContentBlocks;
					if (!Array.isArray(existingContentBlocks))
						return incomingContentBlocks;

					const incomingHasText = hasTextBlock(incomingContentBlocks);
					const existingHasText = hasTextBlock(existingContentBlocks);

					if (incomingHasText || !existingHasText) {
						return incomingContentBlocks;
					}

					return [...existingContentBlocks, ...incomingContentBlocks];
				})();

				const mergeContentText = (
					existingContent: BaseMessage["content"],
					incomingContent: BaseMessage["content"],
				): BaseMessage["content"] => {
					if (incomingContent === "" || incomingContent == null) {
						return existingContent;
					}

					if (
						typeof existingContent === "string" &&
						typeof incomingContent === "string"
					) {
						const existingText = existingContent.trim();
						const incomingText = incomingContent.trim();

						if (existingText.length === 0) return incomingContent;
						if (incomingText.length === 0) return existingContent;

						if (incomingText.includes(existingText)) {
							return incomingContent;
						}

						if (existingText.includes(incomingText)) {
							return existingContent;
						}

						return `${existingContent}\n\n${incomingContent}`;
					}

					return incomingContent;
				};

				return {
					...existingRecord,
					...incomingRecord,
					additional_kwargs:
						incoming.additional_kwargs ?? existing.additional_kwargs,
					content: mergeContentText(existing.content, incoming.content),
					contentBlocks: mergedContentBlocks,
					name: incomingRecord.name ?? existingRecord.name,
					status: incomingRecord.status ?? existingRecord.status,
					tool_call_id:
						incomingRecord.tool_call_id ?? existingRecord.tool_call_id,
					tool_calls: incomingRecord.tool_calls ?? existingRecord.tool_calls,
				};
			};

			for (const msg of streamMsgs) {
				if (msg.type === "human") continue;

				const msgId = msg.id ?? `${msg.type}-${Date.now()}-${Math.random()}`;

				// AI messages stream incrementally — same ID, growing content.
				// Always update in-place, never skip via mergedStreamIdsRef.
				if (msg.type === "ai") {
					const existingIdx = updated.findIndex(
						(m) => m.id === msg.id && m.id !== undefined,
					);
					if (existingIdx !== -1) {
						updated[existingIdx] = mergeStreamMessage(
							updated[existingIdx] as BaseMessage,
							msg,
						);
					} else {
						updated.push(msg);
					}
					mergedStreamIdsRef.current.add(msgId);
					continue;
				}

				// Tool messages can be updated multiple times for the same tool_call_id.
				// Keep the latest snapshot so persistence sees final content/status.
				if (msg.type === "tool") {
					// biome-ignore lint/suspicious/noExplicitAny: LangChain SDK ToolMessage type not re-exported
					const toolCallId = (msg as any).tool_call_id;
					const existingIdx = updated.findIndex(
						// biome-ignore lint/suspicious/noExplicitAny: tool_call_id only on tool messages
						(m) => m.type === "tool" && (m as any).tool_call_id === toolCallId,
					);
					if (existingIdx !== -1) {
						updated[existingIdx] = mergeStreamMessage(
							updated[existingIdx] as BaseMessage,
							msg,
						);
					} else {
						updated.push(msg);
					}
					continue;
				}

				if (mergedStreamIdsRef.current.has(msgId)) continue;
				mergedStreamIdsRef.current.add(msgId);

				if (!updated.some((m) => m.id === msg.id)) {
					updated.push(msg);
				}
			}

			return updated;
		});
	}, [stream.messages]);

	useEffect(() => {
		if (!options.onToolComplete) return;

		for (const msg of accumulatedMessages) {
			if (msg.type !== "tool") continue;

			const toolMessage = msg as BaseMessage & {
				tool_call_id?: string;
				name?: string;
			};

			const toolCallId = toolMessage.tool_call_id;
			const toolName = toolMessage.name;

			if (!toolCallId || typeof toolName !== "string") continue;
			if (completedToolCallIdsRef.current.has(toolCallId)) continue;

			completedToolCallIdsRef.current.add(toolCallId);
			options.onToolComplete(toolName);
		}
	}, [accumulatedMessages, options.onToolComplete]);

	useEffect(() => {
		for (const msg of accumulatedMessages) {
			if (msg.type !== "tool") continue;

			const toolMessage = msg as BaseMessage & {
				tool_call_id?: string;
				name?: string;
				content?: unknown;
			};

			if (toolMessage.name !== "generate_followup_questions") continue;

			const content = getTextFromContent(toolMessage.content);
			if (!content) continue;

			try {
				const parsed = JSON.parse(content);
				if (
					Array.isArray(parsed) &&
					parsed.every((q: unknown) => typeof q === "string")
				) {
					const questions = parsed.filter(
						(q: string) => q.trim().length > 0,
					);
					if (questions.length > 0) {
						setFollowUpQuestions(questions);
					}
				}
			} catch {}
		}
	}, [accumulatedMessages]);

	const isRunning = stream.isLoading;

	const messageRepository = useMemo(() => {
		const threadMessages = toThreadMessages(
			accumulatedMessages as unknown as readonly BaseMessage[],
		);

		if (streamError && threadMessages.length > 0) {
			const lastIdx = threadMessages.findLastIndex(
				(msg) => msg.role === "assistant",
			);
			if (lastIdx !== -1) {
				threadMessages[lastIdx] = {
					...threadMessages[lastIdx],
					status: {
						type: "incomplete" as const,
						reason: "error" as const,
					},
				};
			}
		}

		const items = threadMessages.map((msg, idx) => {
			const isLast = idx === threadMessages.length - 1;
			const autoStatus = getAutoStatus(
				isLast,
				isRunning,
				false,
				false,
				undefined,
			);
			const threadMessage = fromThreadMessageLike(
				msg,
				msg.id ?? idx.toString(),
				autoStatus,
			);
			return {
				message: threadMessage,
				parentId: idx > 0 ? (threadMessages[idx - 1]?.id ?? null) : null,
			};
		});

		return ExportedMessageRepository.fromBranchableArray(items);
	}, [accumulatedMessages, streamError, isRunning]);

	const prevLoading = useRef(stream.isLoading);

	useEffect(() => {
		if (stream.isLoading) {
			setStreamError(null);
			setFollowUpQuestions([]);
		}
	}, [stream.isLoading]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only trigger on loading transition, use refs for current values
	useEffect(() => {
		if (options.shareView) return;
		if (prevLoading.current && !stream.isLoading) {
			const userMessage = lastUserMessageRef.current;

			// Filter out AI messages that are JSON control messages (e.g., question JSON).
			// These are detected on the server-side by graphs.ts executorNode but may
			// have already been streamed to the client before the server removes them.
			// Keep AI messages that have tool_call contentBlocks even if text is JSON,
			// because getOrderedMessages needs them to build the toolCallIdToName lookup.
			const filteredMessages = accumulatedMessages.filter((msg: any) => {
				if (msg.type !== "ai") return true;
				const content = msg.content;
				if (typeof content === "string" && content.trim().startsWith("{")) {
					return false;
				}
				if (Array.isArray(content)) {
					const textBlocks = content.filter(
						(block: any) =>
							typeof block === "object" &&
							block?.type === "text" &&
							typeof block.text === "string",
					);
					if (textBlocks.length > 0) {
						const allJson = textBlocks.every((block: any) =>
							block.text.trim().startsWith("{"),
						);
						if (allJson) {
							const hasToolCallBlocks = content.some(
								(block: any) => block?.type === "tool_call",
							);
							if (!hasToolCallBlocks) return false;
						}
					}
				}
				return true;
			});

			const turnStartIndex = turnStartIndexRef.current;
			const turnMessages =
				typeof turnStartIndex === "number"
					? filteredMessages.slice(turnStartIndex)
					: filteredMessages;
			const orderedMessages = getOrderedMessages(turnMessages as any);

			if (process.env.NODE_ENV === "development") {
			console.log("[CHAT_PERSIST_DEBUG][useAssistantRuntime] Stream finish", {
				chatId: currentChatIdRef.current,
				threadId: options.threadId,
				userMessage,
					streamMessages: (stream.messages as unknown as BaseMessage[]).map(
						(msg) => {
							const streamMessage = msg as BaseMessage & {
								tool_call_id?: string;
								name?: string;
								status?: string;
								tool_calls?: unknown;
							};

							return {
								id: streamMessage.id,
								type: streamMessage.type,
								content: streamMessage.content,
								toolCallId: streamMessage.tool_call_id,
								name: streamMessage.name,
								status: streamMessage.status,
								toolCalls: streamMessage.tool_calls,
								additionalKwargs: streamMessage.additional_kwargs,
							};
						},
					),
					filteredMessages: filteredMessages.map((msg) => {
						const streamMessage = msg as BaseMessage & {
							tool_call_id?: string;
							name?: string;
							status?: string;
						};

						return {
							id: streamMessage.id,
							type: streamMessage.type,
							toolCallId: streamMessage.tool_call_id,
							name: streamMessage.name,
							status: streamMessage.status,
						};
					}),
					orderedMessages,
					pendingQuestion: pendingQuestionRef.current,
				});
			}

			const chatIdToUse = currentChatIdRef.current;
			if (chatIdToUse && userMessage && options.token) {
				saveMessagesToBackend(
					chatIdToUse,
					userMessage,
					orderedMessages,
					options.token,
				)
					.catch(() => undefined)
					.finally(() => {
						options.onStreamFinish?.(orderedMessages, userMessage);
						turnStartIndexRef.current = null;
					});
			} else {
				options.onStreamFinish?.(orderedMessages, userMessage);
				turnStartIndexRef.current = null;
			}
		}
		prevLoading.current = stream.isLoading;
	}, [stream.isLoading]);

	const onNew = useCallback(
		async (message: AppendMessage) => {
			if (options.shareView) return;
			setStreamError(null);
			turnStartIndexRef.current = accumulatedMessagesRef.current.length;

			const answer = message.content.find(
				(part): part is { type: "text"; text: string } =>
					part.type === "text" && typeof part.text === "string",
			)?.text;

			const currentQuestion = pendingQuestionRef.current;
			if (currentQuestion && answer) {
				const answerText = answer.trim();
				if (!answerText) return;
				const wrappedAnswer = answerText.startsWith("[Answer:")
					? answerText
					: `[Answer: ${answerText}]`;

				setAccumulatedMessages((prev) => {
					const updated = [...prev];
					const lastAssistantIdx = updated.findLastIndex(
						(m) => m.type === "ai",
					);
					if (lastAssistantIdx !== -1) {
						const msg = updated[lastAssistantIdx] as BaseMessage &
							Record<string, unknown>;
						const existingKwargs =
							typeof msg.additional_kwargs === "object" &&
							msg.additional_kwargs !== null
								? msg.additional_kwargs
								: {};
						updated[lastAssistantIdx] = {
							...msg,
							additional_kwargs: {
								...existingKwargs,
								questionFlow: {
									questions: currentQuestion.questions,
									answer: wrappedAnswer,
								},
								question: {
									text: currentQuestion.questions[0]?.text ?? "",
									options: currentQuestion.questions[0]?.options ?? [],
								},
								answeredQuestion: {
									text: currentQuestion.questions[0]?.text ?? "",
									options: currentQuestion.questions[0]?.options ?? [],
									answer: wrappedAnswer,
								},
							},
						};
					}

					return updated;
				});

			setPendingQuestion(null);
			await stream.submit({
				messages: [{ content: wrappedAnswer, type: "human" }],
			});
			return;
		}

		const content = toLangGraphMessageContent(
			message.content as readonly {
				type: string;
				text?: string;
				image?: string;
			}[],
		);
		if (!content) return;

		const messageToSend = content;

		setAccumulatedMessages((prev) => [
			...prev,
			new HumanMessage({
				content: messageToSend,
				id: `${Date.now()}_user`,
			}),
		]);

		await stream.submit({
			messages: [{ content: messageToSend, type: "human" }],
		});
	},
	[stream, options.shareView],
);
	const onEdit = useCallback(
		async (message: AppendMessage) => {
			if (options.shareView) return;
			setStreamError(null);

			if (stream.isLoading) {
				stream.stop();
			}

		const content = toLangGraphMessageContent(
			message.content as readonly {
				type: string;
				text?: string;
				image?: string;
			}[],
		);
		if (!content) return;

		const messageToSend = content;

			setAccumulatedMessages((prev) => {
				const lastUserIdx = prev.findLastIndex((m) => m.type === "human");
				if (lastUserIdx === -1) return prev;

				const truncated = prev.slice(0, lastUserIdx);
				truncated.push(
					new HumanMessage({
						content: messageToSend,
						id: `${Date.now()}_user_edit`,
					}),
				);
				return truncated;
			});

			turnStartIndexRef.current = null;
			mergedStreamIdsRef.current.clear();

			await stream.submit({
				messages: [{ content: messageToSend, type: "human" }],
			});
		},
		[stream, options.shareView],
	);

	const runtime = useExternalStoreRuntime<ThreadMessageLike>({
		adapters: {
			attachments: attachmentAdapter,
			dictation: WebSpeechDictationAdapter.isSupported()
				? new WebSpeechDictationAdapter({
						continuous: true,
						interimResults: true,
					})
				: undefined,
		},
		convertMessage: (m) => m,
		isRunning: stream.isLoading,
		messageRepository,
		onCancel: async () => {
			stream.stop();
		},
		onEdit,
		onNew,
	});

	return { ...runtime, followUpQuestions };
}

async function saveMessagesToBackend(
	chatId: number,
	userMessage: string,
	orderedMessages: OrderedStreamMessage[],
	token: string,
): Promise<void> {
	const exchange: Array<{
		role: "user" | "assistant";
		content: string;
		metadata?: Record<string, unknown>;
	}> = [{ role: "user", content: userMessage }];

	for (const msg of orderedMessages) {
		if (msg.type === "ai") {
			exchange.push({
				role: "assistant",
				content: msg.content,
				...(msg.metadata ? { metadata: msg.metadata } : {}),
			});
		} else {
			exchange.push({
				role: "assistant",
				content: msg.content,
				metadata: {
					kind: `tool_${msg.toolName}`,
					toolName: msg.toolName,
					runId: msg.runId,
					data: msg.data,
					status: msg.status,
				},
			});
		}
	}

	const response = await fetch(`${config.apiUrl}/agent/save-messages`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			chat_id: chatId,
			messages: exchange,
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to save messages");
	}
}

function getTextFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter(
			(part): part is { type: string; text: string } =>
				typeof part === "object" &&
				part !== null &&
				"type" in part &&
				"text" in part &&
				part.type === "text" &&
				typeof part.text === "string",
		)
		.map((part) => part.text)
		.join("");
}
