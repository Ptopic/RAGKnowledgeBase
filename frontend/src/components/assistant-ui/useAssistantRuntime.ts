"use client";

import {
	type AppendMessage,
	type ThreadMessageLike,
	useExternalStoreRuntime,
} from "@assistant-ui/react";
import { type BaseMessage, HumanMessage, type Message } from "@langchain/core/messages";
import {
	FetchStreamTransport,
	useStream,
} from "@langchain/langgraph-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOrderedMessages } from "@/lib/chat/message-ordering";
import { config } from "@/shared/config/config";
import type { OrderedStreamMessage } from "@/types/chat.types";
import { toLangGraphMessageContent, toThreadMessages } from "./toThreadMessages";

export interface UseAssistantRuntimeOptions {
	endpoint: string;
	threadId: string;
	searchSpaceId: string;
	token?: string;
	chatId?: number;
	selectedConnectors?: string[];
	selectedDocumentIds?: number[];
	initialMessages?: BaseMessage[];
	onChatCreated?: (chatId: number) => void;
	onStreamFinish?: (
		orderedMessages: OrderedStreamMessage[],
		userMessage: string,
		chatId: number,
	) => void;
	onStreamError?: (error: Error | string) => void;
}

export function useAssistantRuntime(options: UseAssistantRuntimeOptions) {
	const {
		endpoint,
		threadId,
		searchSpaceId,
		token,
		chatId,
		selectedConnectors,
		selectedDocumentIds,
		initialMessages,
		onChatCreated,
		onStreamFinish,
		onStreamError,
	} = options;

	const [currentChatId, setCurrentChatId] = useState<number | undefined>(chatId);
	const currentChatIdRef = useRef<number | undefined>(chatId);
	const lastUserMessageRef = useRef<string>("");

	useEffect(() => {
		if (chatId !== currentChatId) {
			setCurrentChatId(chatId);
			currentChatIdRef.current = chatId;
		}
	}, [chatId, currentChatId]);

	useEffect(() => {
		currentChatIdRef.current = currentChatId;
	}, [currentChatId]);

	const [accumulatedMessages, setAccumulatedMessages] = useState<BaseMessage[]>(
		initialMessages ?? [],
	);
	const accumulatedMessagesRef = useRef<BaseMessage[]>(initialMessages ?? []);

	useEffect(() => {
		accumulatedMessagesRef.current = accumulatedMessages;
	}, [accumulatedMessages]);

	useEffect(() => {
		setAccumulatedMessages(initialMessages ?? []);
	}, [initialMessages]);

	const transport = useMemo(
		() =>
			new FetchStreamTransport({
				apiUrl: endpoint,
				fetch: async (url: string, init?: RequestInit) => {
					const headers = new Headers(init?.headers);
					if (token) headers.set("Authorization", `Bearer ${token}`);

					const response = await fetch(url, {
						...init,
						headers,
					});

					const chatIdHeader = response.headers.get("X-Chat-Id");
					if (chatIdHeader && !currentChatIdRef.current) {
						const newChatId = Number.parseInt(chatIdHeader, 10);
						currentChatIdRef.current = newChatId;
						setCurrentChatId(newChatId);
						onChatCreated?.(newChatId);
					}

					return response;
				},
				onRequest: async (_url: string, init: RequestInit) => {
					const langchainBody = JSON.parse(init.body as string) || {};
					const messages = langchainBody.input?.messages || [];
					const lastMessage = messages[messages.length - 1];
					const messageContent = lastMessage?.content || "";
					lastUserMessageRef.current =
						typeof messageContent === "string"
							? messageContent
							: JSON.stringify(messageContent);

					const customBody = {
						messages: [{ content: messageContent, role: "user" }],
						chat_id: currentChatIdRef.current,
						data: {
							search_space_id: searchSpaceId,
							research_mode: "QNA",
							selected_connectors: selectedConnectors,
							document_ids_to_add_in_context: selectedDocumentIds,
							search_mode: "CHUNKS",
						},
					};

					return {
						...init,
						body: JSON.stringify(customBody),
					};
				},
			}),
		[endpoint, token, searchSpaceId, selectedConnectors, selectedDocumentIds, onChatCreated],
	);

	const stream = useStream({
		transport,
		threadId,
		onError: (error) => {
			onStreamError?.(error instanceof Error ? error : new Error(String(error)));
		},
	});

	useEffect(() => {
		const streamMsgs = stream.messages as unknown as readonly BaseMessage[];
		if (streamMsgs.length === 0) return;

		setAccumulatedMessages((prev) => {
			const updated = [...prev];

			for (const msg of streamMsgs) {
				if (msg.type === "human") continue;

				if (msg.type === "tool") {
					const toolMsg = msg as BaseMessage & { tool_call_id?: string };
					const existingIdx = updated.findIndex((m) => {
						if (m.type !== "tool") return false;
						const t = m as BaseMessage & { tool_call_id?: string };
						return t.tool_call_id === toolMsg.tool_call_id;
					});

					if (existingIdx !== -1) updated[existingIdx] = msg;
					else updated.push(msg);
					continue;
				}

				if (msg.type === "ai") {
					const content =
						typeof msg.content === "string"
							? msg.content
							: JSON.stringify(msg.content);
					if (content.trim().startsWith("{")) continue;

					const existingIdx = updated.findIndex(
						(m) => m.id === msg.id && m.id !== undefined,
					);
					if (existingIdx !== -1) updated[existingIdx] = msg;
					else updated.push(msg);
				}
			}

			return updated;
		});
	}, [stream.messages]);

	const prevLoading = useRef(stream.isLoading);
	useEffect(() => {
		if (prevLoading.current && !stream.isLoading) {
			const userMessage = lastUserMessageRef.current;
			const orderedMessages = getOrderedMessages(
				accumulatedMessagesRef.current as unknown as Message[],
			);

			const chatIdToUse = currentChatIdRef.current;
			if (chatIdToUse && userMessage && token) {
				saveMessagesToBackend(chatIdToUse, userMessage, orderedMessages, token)
					.catch(() => undefined)
					.finally(() => {
						onStreamFinish?.(orderedMessages, userMessage, chatIdToUse);
					});
			} else if (chatIdToUse) {
				onStreamFinish?.(orderedMessages, userMessage, chatIdToUse);
			}
		}
		prevLoading.current = stream.isLoading;
	}, [stream.isLoading, onStreamFinish, token]);

	const runtimeMessages = useMemo(
		() => toThreadMessages(accumulatedMessages),
		[accumulatedMessages],
	);

	const onNew = useCallback(
		async (message: AppendMessage) => {
			const content = toLangGraphMessageContent(
				message.content as readonly {
					type: string;
					text?: string;
					image?: string;
				}[],
			);
			if (!content) return;

			setAccumulatedMessages((prev) => [
				...prev,
				new HumanMessage({
					content,
					id: `${Date.now()}_user`,
				}),
			]);

			await stream.submit({
				messages: [{ content, type: "human" }],
			});
		},
		[stream],
	);

	const onEdit = useCallback(
		async (message: AppendMessage) => {
			if (stream.isLoading) stream.stop();

			const content = toLangGraphMessageContent(
				message.content as readonly {
					type: string;
					text?: string;
					image?: string;
				}[],
			);
			if (!content) return;

			setAccumulatedMessages((prev) => {
				const lastUserIdx = prev.findLastIndex((m) => m.type === "human");
				if (lastUserIdx === -1) return prev;

				const truncated = prev.slice(0, lastUserIdx);
				truncated.push(
					new HumanMessage({
						content,
						id: `${Date.now()}_user_edit`,
					}),
				);
				return truncated;
			});

			await stream.submit({
				messages: [{ content, type: "human" }],
			});
		},
		[stream],
	);

	const runtime = useExternalStoreRuntime<ThreadMessageLike>({
		convertMessage: (m) => m,
		isRunning: stream.isLoading,
		messages: runtimeMessages,
		onCancel: async () => {
			stream.stop();
		},
		onEdit,
		onNew,
	});

	return runtime;
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
