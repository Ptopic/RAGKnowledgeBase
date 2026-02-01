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
import type { ChatMessage, OrderedStreamMessage } from "@/types/chat.types";

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
	type: "archive" | "transcript" | "article";
	messages: Message<StandardMessageStructure, MessageType>[];
	setMessages: Dispatch<SetStateAction<Message[]>>;
	inputText: string;
	setInputText: Dispatch<SetStateAction<string>>;
	threadId: string;
	endpoint: string;
	// chatId: number | undefined;
	userId: number;
	token?: string;
	searchSpaceId: string;
	selectedConnectors?: string[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	// selectedFilters?: IChatSearchFilters | ITranscriptChatSearchFilters;
	// articleId?: number;
	// articleContent?: {
	// 	title: string;
	// 	ingress: string;
	// 	content: string;
	// };
	// selectedArticleContent?: string;
	// setSelectedArticleContent?: Dispatch<SetStateAction<string | null>>;
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;

	// Lifecycle callbacks
	onToolCall?: (toolCall: ToolCall, message: AIMessage) => void;
	onToolComplete?: (toolMessage: ToolMessage) => void;
	onStreamStart?: () => void;
	onStreamFinish?: (
		orderedMessages: Array<OrderedStreamMessage>,
		userMessage: string,
	) => void;
	onStreamError?: (error: Error | string) => void;
	onMessageUpdate?: (messages: Message[]) => void;
	// onChatCreated?: (chatId: number) => void;
	// language?: string;
}

export interface UseChatStreamReturn {
	isStreaming: boolean;
	isStreamingFinished: boolean;
	isStartingStreaming: boolean;
	// currentChatId: number | undefined;
	toolCallsByMessage: Map<Message, ToolCallState[]>;
	errorMessage: string | undefined;
	lastUserMessageRef: React.RefObject<HTMLDivElement | null>;
	sendMessage: (messageOverride?: string) => Promise<void>;
	stopStreaming: () => void;
	handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	handleKeyDown: (e: React.KeyboardEvent) => void;
	scrollToBottom: () => void;
	scrollToLastUserMessage: () => void;
	// setCurrentChatId: Dispatch<SetStateAction<number | undefined>>;
}

export function useChatStream(
	options: UseChatStreamOptions,
): UseChatStreamReturn {
	const {
		type,
		messages,
		setMessages,
		inputText,
		setInputText,
		threadId,
		endpoint,
		// chatId,
		userId,
		token,
		searchSpaceId,
		selectedConnectors,
		searchMode,
		// selectedFilters,
		// articleId,
		// articleContent,
		// selectedArticleContent,
		scrollContainerRef,
		// setSelectedArticleContent,
		onToolCall,
		onToolComplete,
		onStreamStart,
		onStreamFinish,
		onStreamError,
		onMessageUpdate,
		// onChatCreated,
		// language,
	} = options;

	const [isStartingStreaming, setIsStartingStreaming] = useState(false);

	const [isStreamingFinished, setIsStreamingFinished] = useState(true);

	// Use ref to track messages immediately for transport (fixes closure stale data issue)
	const messagesRef = useRef<Message[]>(messages);

	// Sync ref when messages prop changes
	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

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

				return response;
			},
			onRequest: async (_url: string, init: RequestInit) => {
				// Use ref to get latest messages (avoid closure stale data)
				const currentMessages = messagesRef.current;

				const mappedMessages = currentMessages.map((msg: any) => {
					let role = "user";
					if (msg.type === "ai") role = "assistant";
					else if (msg.type === "system") role = "system";
					else if (msg.type === "tool") role = "tool";

					return {
						role,
						content: msg.content,
						...msg,
					};
				});

				const customBody = {
					messages: mappedMessages,
					data: {
						search_space_id: searchSpaceId,
						research_mode: type,
						selected_connectors: selectedConnectors,
						search_mode: searchMode,
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
		userId,
		threadId,
		type,
		token,
		searchSpaceId,
		selectedConnectors,
		searchMode,
		onStreamStart,
	]);

	const stream = useStream({
		transport,
		onCustomEvent: (data: any) => {
			console.log("✅ CUSTOM EVENT DATA:", data);

			if (data?.type === "question") {
				const jsonData = JSON.stringify(data);

				setMessages((prev) => [
					...prev,
					{
						id: `question_${Date.now()}`,
						type: "question",
						content: jsonData,
						additional_kwargs: { options: data.options },
					} as ChatMessage,
				]);

				// questionMessagesRef.current.push({
				// 	type: "question",
				// 	content: jsonData,
				// 	options: data.options,
				// });
			}
		},
	});

	// const { mutateAsync: addMessagesToMemory } =
	// 	useAddMessagesToConversationMemory();

	// const handleAddMessagesToMemory = async (
	// 	chatId: number,
	// 	userMessage: string,
	// 	orderedMessages: OrderedStreamMessage[],
	// 	type: "archive" | "transcript" | "article",
	// 	articleId?: number,
	// ) => {
	// 	await addMessagesToMemory({
	// 		chatId,
	// 		userMessage,
	// 		orderedMessages,
	// 		type,
	// 		articleId,
	// 	});
	// };

	const prevLoading = useRef(stream.isLoading);
	// const lastUserMessageContentRef = useRef<string>("");
	const lastUserMessageRef = useRef<HTMLDivElement>(null);
	const processedToolCallIds = useRef<Set<string>>(new Set());
	const completedToolCallIds = useRef<Set<string>>(new Set());
	const notifiedToolCallIds = useRef<Set<string>>(new Set());
	// const questionMessagesRef = useRef<OrderedStreamMessage[]>([]);

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
					toolCallStates.push({ toolCall, toolMessage });
				}
				map.set(message, toolCallStates);
			}
		});
		return map;
	}, [messages]);

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
					// handleToolCompletions({
					// 	type,
					// 	tool: toolMessage,
					// 	setArticleResults,
					// 	setTranscriptResults,
					// });
					onToolComplete?.(toolMessage);
				}
			}
		});
	}, [messages, onToolCall, onToolComplete, type]);

	// Handle stream finish
	useEffect(() => {
		if (prevLoading.current && !stream.isLoading) {
			console.log("Stream finished!");
			setIsStreamingFinished(true);

			// const userMessage = lastUserMessageContentRef.current;
			// const orderedMessages = getOrderedMessages(stream.messages, type);
			// const questionMessages = questionMessagesRef.current;

			// FILTER: Remove raw JSON control messages before saving to DB
			// const messagesToSave = orderedMessages.filter((msg) => {
			// 	const content = msg.content;
			// 	const isJsonMessage =
			// 		msg.type === "ai" &&
			// 		typeof content === "string" &&
			// 		content.trim().startsWith("{");
			// 	return !isJsonMessage;
			// });
			// messagesToSave.push(...questionMessages);

			// const chatIdToUse = currentChatIdRef.current;
			// if (chatIdToUse && userMessage) {
			// 	handleAddMessagesToMemory(
			// 		chatIdToUse,
			// 		userMessage,
			// 		messagesToSave,
			// 		type,
			// 		articleId,
			// 	).then(() => {
			// 		onStreamFinish?.(messagesToSave, userMessage);
			// 		questionMessagesRef.current = [];
			// 	});
			// } else {
			// 	questionMessagesRef.current = [];
			// }
			// questionMessagesRef.current = [];
		}
		prevLoading.current = stream.isLoading;
	}, [stream.isLoading, onStreamFinish, type]);

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
					// 1. Skip System Messages
					if (streamMsg.type === "system") continue;

					// 2. Handle Tool Messages
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

					// 3. Handle AI Messages (Filter JSON)
					if (streamMsg.type === "ai") {
						const content =
							typeof streamMsg.content === "string" ? streamMsg.content : "";

						// If starts with {, it's likely our raw JSON control message. Skip it.
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
		}, 50); // Fast poll

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

	const sendMessage = useCallback(
		async (messageOverride?: string) => {
			const textToSend = messageOverride || inputText;

			if (textToSend.trim() === "") return;

			if (isStreaming) {
				stream.stop();
				setInputText("");
			}

			processedToolCallIds.current.clear();
			// questionMessagesRef.current = [];
			// lastUserMessageContentRef.current = textToSend;

			const timestamp = Date.now();
			const userMessageId = `${timestamp.toString()}_user`;
			const messageToSend = textToSend;

			// if (selectedArticleContent) {
			// 	messageToSend = `Article Content: ${selectedArticleContent} User Query: ${messageToSend}`;
			// }

			const newMessage = {
				id: userMessageId,
				type: "human",
				content: messageToSend,
			} as Message;
			const newMessages = [...messages, newMessage];

			// Update ref immediately so onRequest can access it (fixes closure stale data)
			messagesRef.current = newMessages;
			setMessages(newMessages);

			setInputText("");
			setIsStartingStreaming(true);
			setIsStreamingFinished(false);
			// setSelectedArticleContent?.(null);

			setTimeout(() => {
				scrollToLastUserMessage();
			}, 200);

			await stream.submit({
				messages: newMessages,
			});
		},
		[
			inputText,
			stream,
			isStreaming,
			setInputText,
			scrollToLastUserMessage,
			setMessages,
			scrollContainerRef,
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
		// currentChatId,
		// articleResults,
		// transcriptResults,
		toolCallsByMessage,
		errorMessage,
		lastUserMessageRef,
		sendMessage,
		stopStreaming,
		handleInputChange,
		handleKeyDown,
		scrollToBottom,
		scrollToLastUserMessage,
		// setCurrentChatId,
	};
}
