"use client";

import { useChat } from "@ai-sdk/react";
import config from "@shared/config";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
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
		researchMode,
		selectedConnectors,
		setSelectedConnectors,
		selectedDocuments,
		setSelectedDocuments,
	} = useChatState({
		search_space_id: search_space_id as string,
		chat_id: chatIdParam,
	});

	const { fetchChatDetails, updateChat, createChat } = useChatAPI({
		token,
		search_space_id: search_space_id as string,
	});

	// Memoize document IDs to prevent infinite re-renders
	const documentIds = useMemo(() => {
		return selectedDocuments.map((doc) => doc.id);
	}, [selectedDocuments]);

	// Memoize connector types to prevent infinite re-renders
	const connectorTypes = useMemo(() => {
		return selectedConnectors;
	}, [selectedConnectors]);

	// Unified localStorage management for chat state
	interface ChatState {
		selectedDocuments: Document[];
		selectedConnectors: string[];
		searchMode: "DOCUMENTS" | "CHUNKS";
		researchMode: "QNA";
	}

	const getChatStateStorageKey = useCallback(
		(searchSpaceId: string, chatId: string) =>
			`surfsense_chat_state_${searchSpaceId}_${chatId}`,
		[],
	);

	const storeChatState = useCallback(
		(searchSpaceId: string, chatId: string, state: ChatState) => {
			const key = getChatStateStorageKey(searchSpaceId, chatId);
			localStorage.setItem(key, JSON.stringify(state));
		},
		[getChatStateStorageKey],
	);

	const restoreChatState = useCallback(
		(searchSpaceId: string, chatId: string): ChatState | null => {
			const key = getChatStateStorageKey(searchSpaceId, chatId);
			const stored = localStorage.getItem(key);
			if (stored) {
				localStorage.removeItem(key);
				try {
					return JSON.parse(stored);
				} catch (error) {
					console.error("Error parsing stored chat state:", error);
					return null;
				}
			}
			return null;
		},
		[getChatStateStorageKey],
	);

	const handler = useChat({
		api: `${config.apiUrl}/chat`,
		streamProtocol: "data",
		initialMessages: [],
		headers: {
			...(token && { Authorization: `Bearer ${token}` }),
		},
		body: {
			data: {
				search_space_id: search_space_id,
				selected_connectors: connectorTypes,
				research_mode: researchMode,
				search_mode: searchMode,
				document_ids_to_add_in_context: documentIds,
			},
		},
		onError: (error) => {
			console.error("Chat error:", error);
		},
	});

	// Use refs to prevent infinite loops in useEffect
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	// Track if chat has been loaded to prevent re-fetching
	const chatLoadedRef = useRef<string | null>(null);

	const loadChatData = useCallback(
		async (chatId: string) => {
			// Prevent loading the same chat multiple times
			if (chatLoadedRef.current === chatId) return;
			chatLoadedRef.current = chatId;

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
					if (
						chatData.messages.length === 1 &&
						chatData.messages[0].role === "user"
					) {
						// Single user message - append to trigger LLM response
						handlerRef.current.append({
							role: "user",
							content: chatData.messages[0].content,
						});
					} else if (chatData.messages.length > 1) {
						// Multiple messages - set them all
						handlerRef.current.setMessages(chatData.messages);
					}
				}
			} finally {
				setIsLoading(false);
			}
		},
		[fetchChatDetails, setSelectedConnectors, setIsLoading],
	);

	const customHandlerAppend = useCallback(
		async (message: { role: string; content: string }) => {
			const newChatId = await createChat(
				message.content,
				researchMode,
				selectedConnectors,
			);
			if (newChatId) {
				storeChatState(search_space_id as string, newChatId, {
					selectedDocuments,
					selectedConnectors,
					searchMode,
					researchMode,
				});
				router.replace(`/dashboard/${search_space_id}/researcher/${newChatId}`);
			}
		},
		[
			createChat,
			researchMode,
			selectedConnectors,
			storeChatState,
			search_space_id,
			selectedDocuments,
			searchMode,
			router,
		],
	);

	useEffect(() => {
		if (token && !isNewChat && chatIdParam) {
			setIsLoading(true);
			loadChatData(chatIdParam);
		}
	}, [token, isNewChat, chatIdParam, setIsLoading, loadChatData]);

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
			}
		}
	}, [
		chatIdParam,
		search_space_id,
		setSelectedDocuments,
		setSelectedConnectors,
		setSearchMode,
		restoreChatState,
	]);

	// Auto-update chat when messages change (only for existing chats)
	useEffect(() => {
		if (
			!isNewChat &&
			chatIdParam &&
			handler.status === "ready" &&
			handler.messages.length > 0 &&
			handler.messages[handler.messages.length - 1]?.role === "assistant"
		) {
			updateChat(
				chatIdParam,
				handler.messages,
				researchMode,
				selectedConnectors,
			);
		}
	}, [
		handler.messages,
		handler.status,
		chatIdParam,
		isNewChat,
		updateChat,
		researchMode,
		selectedConnectors,
	]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
			</div>
		);
	}

	return (
		<ChatInterface
			handler={{
				...handler,
				append: isNewChat ? customHandlerAppend : handler.append,
			}}
			onDocumentSelectionChange={setSelectedDocuments}
			selectedDocuments={selectedDocuments}
			onConnectorSelectionChange={setSelectedConnectors}
			selectedConnectors={selectedConnectors}
			searchMode={searchMode}
			onSearchModeChange={setSearchMode}
		/>
	);
}
