"use client";

import type {
	AIMessage,
	Message,
	MessageType,
	StandardMessageStructure,
	ToolCall,
	ToolMessage,
} from "@langchain/core/messages";
import {
	FetchStreamTransport,
	useStream,
} from "@langchain/langgraph-sdk/react";
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Document } from "@/hooks/use-documents";
import { config } from "@/shared/config/config";
import { getOrderedMessages } from "@/lib/chat/message-ordering";
import type { OrderedStreamMessage } from "@/types/chat.types";

function isAIMessage(message: Message): boolean {
	return message.type === "ai";
}

function isToolMessage(message: Message): boolean {
	return message.type === "tool";
}

export interface ToolCallState {
	toolCall: ToolCall;
	toolMessage?: ToolMessage;
	errored?: boolean;
}

export interface UseChatStreamOptions {
	messages: Message<StandardMessageStructure, MessageType>[];
	setMessages: Dispatch<SetStateAction<Message[]>>;
	inputText: string;
	setInputText: Dispatch<SetStateAction<string>>;
	endpoint: string;
	chatId?: number;
	token?: string;
	searchSpaceId: string;
	selectedConnectors?: string[];
	selectedDocuments?: Document[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;

	// Lifecycle callbacks
	onToolCall?: (toolCall: ToolCall, message: AIMessage) => void;
	onToolComplete?: (toolMessage: ToolMessage) => void;
	onStreamStart?: () => void;
	onStreamFinish?: (
		messages: Message[],
		userMessage: string,
		chatId: number,
	) => Promise<void>;
	onStreamError?: (error: Error | string) => void;
	onMessageUpdate?: (messages: Message[]) => void;
	onChatCreated?: (chatId: number) => void;
}

export interface UseChatStreamReturn {
	isStreaming: boolean;
	isStreamingFinished: boolean;
	isStartingStreaming: boolean;
	toolCallsByMessage: Map<Message, ToolCallState[]>;
	errorMessage: string | undefined;
	lastUserMessageRef: React.RefObject<HTMLDivElement | null>;
	sendMessage: (messageOverride?: string) => Promise<void>;
	stopStreaming: () => void;
	handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
	scrollToBottom: () => void;
	scrollToLastUserMessage: () => void;
}

export function useChatStream(
	options: UseChatStreamOptions,
): UseChatStreamReturn {
	const {
		messages,
		setMessages,
		inputText,
		setInputText,
		endpoint,
		chatId,
		token,
		searchSpaceId,
		selectedConnectors,
		selectedDocuments,
		searchMode,
		scrollContainerRef,
		onToolCall,
		onToolComplete,
		onStreamStart,
		onStreamFinish,
		onStreamError,
		onMessageUpdate,
		onChatCreated,
	} = options;

	const [isStartingStreaming, setIsStartingStreaming] = useState(false);
	const [isStreamingFinished, setIsStreamingFinished] = useState(true);
	const [currentChatId, setCurrentChatId] = useState<number | undefined>(
		chatId,
	);

	useEffect(() => {
		if (chatId !== undefined) {
			setCurrentChatId(chatId);
		}
	}, [chatId]);

	const transport = useMemo(() => {
		return new FetchStreamTransport({
			apiUrl: endpoint,
			fetch: async (url: string, init?: RequestInit) => {
				const headers = new Headers(init?.headers);
				if (token) {
					headers.set("Authorization", `Bearer ${token}`);
				}

				const response = await fetch(url, {
					...init,
					headers,
				});

				// Check for X-Chat-Id header to detect new chat creation
				const chatIdHeader = response.headers.get("X-Chat-Id");

				if (chatIdHeader) {
					const newChatId = Number.parseInt(chatIdHeader, 10);
					if (!currentChatId) {
						setCurrentChatId(newChatId);
						pendingCreatedChatIdRef.current = newChatId;
					}
				}

				return response;
			},
			onRequest: async (_url: string, init: RequestInit) => {
				// Transform LangChain request format to custom backend format
				const langchainBody = JSON.parse(init.body as string) || {};
				const lastMessage =
					langchainBody.input?.messages?.[
						langchainBody.input.messages.length - 1
					];
				const messageContent = lastMessage?.content || "";

				const customBody = {
					messages: [{ content: messageContent, role: "user" }],
					chat_id: currentChatId,
					data: {
						search_space_id: searchSpaceId,
						// TODO: Fix research mode later
						research_mode: "QNA",
						selected_connectors: selectedConnectors,
						selected_documents: (selectedDocuments || []).map((doc) => ({
							id: doc.id,
							title: doc.title,
							document_type: doc.document_type,
						})),
						document_ids_to_add_in_context: (selectedDocuments || []).map(
							(doc) => doc.id,
						),
						search_mode: "CHUNKS",
					},
				};

				setIsStartingStreaming(true);
				onStreamStart?.();

				return {
					...init,
					body: JSON.stringify(customBody),
				};
			},
		});
	}, [
		endpoint,
		token,
		currentChatId,
		searchSpaceId,
		selectedConnectors,
		selectedDocuments,
		onStreamStart,
	]);

	const stream = useStream({
		transport,
		onCustomEvent: (data: any) => {
			if (data?.type === "question") {
				const jsonData = JSON.stringify(data);

				setMessages((prev) => [
					...prev,
					{
						id: `question_${Date.now()}`,
						type: "question",
						content: jsonData,
						additional_kwargs: { options: data.options },
					} as Message,
				]);
			}
		},
	});

	const prevLoading = useRef(stream.isLoading);
	const lastUserMessageContentRef = useRef<string>("");
	const lastUserMessageRef = useRef<HTMLDivElement>(null);
	const processedToolCallIds = useRef<Set<string>>(new Set());
	const completedToolCallIds = useRef<Set<string>>(new Set());
	const notifiedToolCallIds = useRef<Set<string>>(new Set());
	const pendingCreatedChatIdRef = useRef<number | null>(null);

	// Extract tool calls logic
	const toolCallsByMessage = useMemo(() => {
		const map = new Map<Message, ToolCallState[]>();

		messages.forEach((message) => {
			if (!isAIMessage(message as AIMessage)) return;

			const aiMessage = message as AIMessage;
			let toolCalls: ToolCall[] = [];

			if (aiMessage.tool_calls && Array.isArray(aiMessage.tool_calls)) {
				toolCalls = aiMessage.tool_calls as ToolCall[];
			}

			const toolMessages: ToolMessage[] = [];

			for (const msg of messages) {
				if (isToolMessage(msg)) {
					const toolMessage = msg as ToolMessage;
					const toolCallId = toolMessage.tool_call_id;

					if (toolCallId && toolCalls.some((tc) => tc.id === toolCallId)) {
						if (!toolMessages.find((tm) => tm.tool_call_id === toolCallId)) {
							toolMessages.push(msg as ToolMessage);
						}
					}
				}
			}

			if (toolCalls.length > 0) {
				const toolCallStates: ToolCallState[] = [];
				for (const toolCall of toolCalls) {
					const toolMessage = toolMessages.find(
						(tm) => tm.tool_call_id === toolCall.id,
					);
					toolCallStates.push({
						toolCall,
						toolMessage,
					});

					if (onToolCall) {
						onToolCall(toolCall, aiMessage);
					}
				}
				map.set(message, toolCallStates);
			}
		});

		return map;
	}, [messages, onToolCall]);

	useEffect(() => {
		messages.forEach((message) => {
			if (isAIMessage(message as AIMessage)) {
				const aiMessage = message as AIMessage;
				const toolCalls = Array.isArray(aiMessage.tool_calls)
					? (aiMessage.tool_calls as ToolCall[])
					: [];

				for (const toolCall of toolCalls) {
					if (toolCall.id && !notifiedToolCallIds.current.has(toolCall.id)) {
						notifiedToolCallIds.current.add(toolCall.id);
						onToolCall?.(toolCall, aiMessage);
					}
				}
			}

			if (isToolMessage(message)) {
				const toolMessage = message as ToolMessage;
				const toolCallId = toolMessage.tool_call_id;

				if (toolCallId && !completedToolCallIds.current.has(toolCallId)) {
					completedToolCallIds.current.add(toolCallId);
					onToolComplete?.(toolMessage);
				}
			}
		});
	}, [messages, onToolCall, onToolComplete]);

	// Handle stream finish
	useEffect(() => {
		if (prevLoading.current && !stream.isLoading) {
			setIsStreamingFinished(true);

			const userMessage = lastUserMessageContentRef.current;

			// Get ordered messages with tool metadata
			const orderedMessages = getOrderedMessages(stream.messages);

			const finalizeChatCreated = () => {
				if (pendingCreatedChatIdRef.current) {
					onChatCreated?.(pendingCreatedChatIdRef.current);
					pendingCreatedChatIdRef.current = null;
				}
			};

			// If we have a chatId, save messages to backend
			if (currentChatId && token) {
				saveMessagesToBackend(
					currentChatId,
					userMessage,
					orderedMessages,
					token,
				)
					.then(() => {
						onStreamFinish?.(stream.messages, userMessage, currentChatId);
						finalizeChatCreated();
					})
					.catch((error) => {
						console.error("Error saving messages to backend:", error);
						onStreamFinish?.(stream.messages, userMessage, currentChatId);
						finalizeChatCreated();
					});
			} else {
				onStreamFinish?.(stream.messages, userMessage, currentChatId || 0);
				finalizeChatCreated();
			}
		}
		prevLoading.current = stream.isLoading;
	}, [stream.isLoading, onStreamFinish, token, currentChatId, onChatCreated, stream.messages]);

	const isStreaming = useMemo(() => stream.isLoading, [stream.isLoading]);

	// POLL MESSAGES: Filter Logic
	useEffect(() => {
		if (!isStreaming) return;

		let shouldHideLoadingIndicator = false;

		const intervalId = setInterval(() => {
			if (stream.messages.length === 0) return;

			setMessages((prev) => {
				const updated = [...prev];
				let hasChanges = false;

				for (const streamMsg of stream.messages) {
					if (streamMsg.type === "system") continue;

					if (streamMsg.type === "tool") {
						const toolMsg = streamMsg as ToolMessage;
						const toolCallId = toolMsg.tool_call_id;

						if (toolCallId && processedToolCallIds.current.has(toolCallId)) {
							continue;
						}

						const exists = updated.some(
							(msg) =>
								msg.type === "tool" &&
								(msg as ToolMessage).tool_call_id === toolCallId,
						);

						if (!exists && toolCallId) {
							updated.push(streamMsg);
							processedToolCallIds.current.add(toolCallId);
							hasChanges = true;
						}
						continue;
					}

					if (streamMsg.type === "ai") {
						const content =
							typeof streamMsg.content === "string" ? streamMsg.content : "";

						if (content.trim().startsWith("{")) {
							continue;
						}

						const existingIndex = updated.findIndex(
							(msg) => msg.id === streamMsg.id,
						);

						if (existingIndex !== -1) {
							if (updated[existingIndex].content !== streamMsg.content) {
								updated[existingIndex] = streamMsg;
								hasChanges = true;
							}
						} else {
							updated.push(streamMsg);
							hasChanges = true;
							shouldHideLoadingIndicator = true;
						}
					}
				}
				return hasChanges ? updated : prev;
			});

			if (shouldHideLoadingIndicator) {
				setIsStartingStreaming(false);
				shouldHideLoadingIndicator = false;
			}
		}, 20);

		return () => clearInterval(intervalId);
	}, [isStreaming, onMessageUpdate]);

	// Scroll actions
	const scrollToLastUserMessage = useCallback(() => {
		if (scrollContainerRef.current) {
			const container = scrollContainerRef.current;
			container.scrollTo({
				top: container.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [scrollContainerRef]);

	const scrollToBottom = useCallback(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTo({
				top: scrollContainerRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [scrollContainerRef]);

	// Input actions
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setInputText(e.target.value);
		},
		[setInputText],
	);

	// Message sending
	const sendMessage = useCallback(
		async (messageOverride?: string) => {
			const textToSend = messageOverride || inputText;

			if (textToSend.trim() === "") return;

			if (isStreaming) {
				stream.stop();
				setInputText("");
			}

			processedToolCallIds.current.clear();
			lastUserMessageContentRef.current = textToSend;

			const timestamp = Date.now();
			const userMessageId = `${timestamp.toString()}_user`;

			const newMessage = {
				id: userMessageId,
				type: "human",
				content: textToSend,
			} as Message;
			const newMessages = [...messages, newMessage];

			setMessages(newMessages);
			setInputText("");
			setIsStartingStreaming(true);
			setIsStreamingFinished(false);

			setTimeout(() => {
				scrollToLastUserMessage();
			}, 200);

			await stream.submit({
				messages: [{ content: textToSend, type: "human" }],
			});
		},
		[
			inputText,
			stream,
			isStreaming,
			setInputText,
			scrollToLastUserMessage,
			setMessages,
			setIsStreamingFinished,
			messages,
		],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				sendMessage();
			}
		},
		[sendMessage],
	);

	const stopStreaming = useCallback(() => {
		stream.stop();
	}, [stream]);

	// Error handling
	useEffect(() => {
		if (stream.error) {
			const error =
				stream.error instanceof Error
					? stream.error
					: new Error(String(stream.error));
			setIsStreamingFinished(true);
			onStreamError?.(error);
		}
	}, [stream.error, onStreamError]);

	const errorMessage =
		stream.error instanceof Error
			? stream.error.message
			: typeof stream.error === "string"
				? stream.error
				: undefined;

	return {
		isStreaming,
		isStartingStreaming,
		isStreamingFinished,
		toolCallsByMessage,
		errorMessage,
		lastUserMessageRef,
		sendMessage,
		stopStreaming,
		handleInputChange,
		handleKeyDown,
		scrollToBottom,
		scrollToLastUserMessage,
	};
}

// API call to save messages after stream finishes
async function saveMessagesToBackend(
	chatId: number,
	userMessage: string,
	orderedMessages: OrderedStreamMessage[],
	token: string,
): Promise<void> {
	// Build exchange: user message first, then AI messages + tool messages with metadata
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
			});
		} else if (msg.type === "tool") {
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
