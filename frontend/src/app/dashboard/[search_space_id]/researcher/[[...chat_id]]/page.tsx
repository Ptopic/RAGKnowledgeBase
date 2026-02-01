"use client";
import type { Message as AISDKMessage } from "@ai-sdk/react";
import type { Message } from "@langchain/core/messages";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import TestChatInterface from "@/components/chat/TestChatInterface";
import { useChatAPI, useChatState } from "@/hooks/use-chat";
import type { Document } from "@/hooks/use-documents";

export default function ResearcherPage() {
	const { search_space_id, chat_id } = useParams();
	const router = useRouter();

	const chatIdParam = Array.isArray(chat_id) ? chat_id[0] : chat_id;
	const isNewChat = !chatIdParam;

	const {
		token,
		isLoading,
		setIsLoading,
		searchMode,
		setSearchMode,
		// researchMode,
		selectedConnectors,
		setSelectedConnectors,
		selectedDocuments,
		setSelectedDocuments,
	} = useChatState({
		search_space_id: search_space_id as string,
		chat_id: chatIdParam,
	});

	// const { fetchChatDetails, updateChat, createChat } = useChatAPI({
	// 	token,
	// 	search_space_id: search_space_id as string,
	// });

	// Use generic Message type from LangChain for the interface
	const [messages, setMessages] = useState<Message[]>([]);

	// Track streaming state for auto-save
	const [isStreaming, setIsStreaming] = useState(false);
	const prevIsStreamingRef = useRef(false);

	// Helper to convert LangChain messages to AI SDK messages for backend
	const convertToAISDKMessages = (
		langChainMessages: Message[],
	): AISDKMessage[] => {
		return langChainMessages
			.filter((msg) => {
				// Filter out system messages and question-type messages
				return (
					msg.type !== "system" &&
					msg.type !== "question" &&
					msg.type !== "tool"
				);
			})
			.map((msg) => {
				let role: "user" | "assistant" | "system" = "user";
				if (msg.type === "ai") role = "assistant";
				else if (msg.type === "system") role = "system";

				return {
					id: msg.id,
					role,
					content: msg.content as string,
				} as AISDKMessage;
			});
	};

	// Memoize document IDs to prevent infinite re-renders
	// const documentIds = useMemo(() => {
	// 	return selectedDocuments.map((doc) => doc.id);
	// }, [selectedDocuments]);

	// Memoize connector types to prevent infinite re-renders
	// const connectorTypes = useMemo(() => {
	// 	return selectedConnectors;
	// }, [selectedConnectors]);

	// Unified localStorage management for chat state
	interface ChatState {
		selectedDocuments: Document[];
		selectedConnectors: string[];
		searchMode: "DOCUMENTS" | "CHUNKS";
		researchMode: "QNA"; // Always QNA mode
	}

	const getChatStateStorageKey = (searchSpaceId: string, chatId: string) =>
		`surfsense_chat_state_${searchSpaceId}_${chatId}`;

	const storeChatState = (
		searchSpaceId: string,
		chatId: string,
		state: ChatState,
	) => {
		const key = getChatStateStorageKey(searchSpaceId, chatId);
		localStorage.setItem(key, JSON.stringify(state));
	};

	const restoreChatState = (
		searchSpaceId: string,
		chatId: string,
	): ChatState | null => {
		const key = getChatStateStorageKey(searchSpaceId, chatId);
		const stored = localStorage.getItem(key);
		if (stored) {
			localStorage.removeItem(key); // Clean up after restoration
			try {
				return JSON.parse(stored);
			} catch (error) {
				console.error("Error parsing stored chat state:", error);
				return null;
			}
		}
		return null;
	};

	// Helper to convert backend/AI SDK messages to LangChain messages
	const convertToLangChainMessages = (apiMessages: any[]): Message[] => {
		return apiMessages.map((msg) => {
			if (msg.role === "user") {
				return { type: "human", content: msg.content, id: msg.id };
			} else if (msg.role === "assistant") {
				return { type: "ai", content: msg.content, id: msg.id };
			}
			// Fallback
			return { type: "system", content: msg.content, id: msg.id };
		}) as Message[];
	};

	const { fetchChatDetails, updateChat, createChat } = useChatAPI({
		token,
		search_space_id: search_space_id as string,
	});

	useEffect(() => {
		if (token && !isNewChat && chatIdParam) {
			setIsLoading(true);
			loadChatData(chatIdParam);
		}
	}, [token, isNewChat, chatIdParam]);

	// Restore chat state from localStorage on page load
	useEffect(() => {
		if (chatIdParam && search_space_id) {
			const restoredState = restoreChatState(
				search_space_id as string,
				chatIdParam,
			);
			if (restoredState) {
				setSelectedDocuments(restoredState.selectedDocuments);
				setSelectedConnectors(restoredState.selectedConnectors);
				setSearchMode(restoredState.searchMode);
				// researchMode is always "QNA", no need to restore
			}
		}
	}, [
		chatIdParam,
		search_space_id,
		setSelectedDocuments,
		setSelectedConnectors,
		setSearchMode,
	]);

	const loadChatData = async (chatId: string) => {
		try {
			const chatData = await fetchChatDetails(chatId);
			if (!chatData) return;

			if (
				chatData.initial_connectors &&
				Array.isArray(chatData.initial_connectors)
			) {
				setSelectedConnectors(chatData.initial_connectors);
			}

			// Load existing messages
			if (chatData.messages && Array.isArray(chatData.messages)) {
				const convertedMessages = convertToLangChainMessages(chatData.messages);
				setMessages(convertedMessages);
			}
		} finally {
			setIsLoading(false);
		}
	};

	// Auto-update chat when stream finishes
	useEffect(() => {
		// Check if streaming just finished
		if (prevIsStreamingRef.current && !isStreaming) {
			console.log("Stream finished, checking for save...", {
				messagesLength: messages.length,
				lastMessage: messages[messages.length - 1],
				chatIdParam,
				isNewChat,
			});

			// Streaming just finished
			if (messages.length > 0 && messages[messages.length - 1]?.type === "ai") {
				const messagesToSave = convertToAISDKMessages(messages);
				console.log("Messages to save:", messagesToSave);

				// Check if we have a chat ID - if not, create new chat
				if (!chatIdParam) {
					console.log("Creating new chat...");
					// Create new chat after streaming finishes with all messages
					createChat(messagesToSave, "QNA", selectedConnectors).then(
						(newChatId) => {
							console.log("Chat created with ID:", newChatId);
							if (newChatId) {
								// Store chat state before navigation
								storeChatState(search_space_id as string, newChatId, {
									selectedDocuments,
									selectedConnectors,
									searchMode,
									researchMode: "QNA",
								});
								// Navigate to the new chat
								router.replace(
									`/dashboard/${search_space_id}/researcher/${newChatId}`,
								);
							}
						},
					);
				} else {
					console.log("Updating existing chat:", chatIdParam);
					// Update existing chat
					updateChat(chatIdParam, messagesToSave, "QNA", selectedConnectors);
				}
			}
		}
		// Update the ref for next comparison
		prevIsStreamingRef.current = isStreaming;
	}, [
		isStreaming,
		messages,
		chatIdParam,
		updateChat,
		createChat,
		selectedConnectors,
		selectedDocuments,
		searchMode,
		search_space_id,
		router,
	]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div>Loading...</div>
			</div>
		);
	}

	return (
		<TestChatInterface
			onDocumentSelectionChange={setSelectedDocuments}
			selectedDocuments={selectedDocuments}
			onConnectorSelectionChange={setSelectedConnectors}
			selectedConnectors={selectedConnectors}
			searchMode={searchMode}
			onSearchModeChange={setSearchMode}
			messages={messages}
			setMessages={setMessages}
			threadId={chatIdParam || "new_chat"}
			userId={1} // Default user, should be dynamic if possible
			token={token}
			searchSpaceId={search_space_id as string}
			onStreamStart={() => {
				console.log("page.tsx: onStreamStart called");
				setIsStreaming(true);
			}}
			onStreamFinish={() => {
				console.log("page.tsx: onStreamFinish called");
				setIsStreaming(false);
			}}
		/>
	);
}
