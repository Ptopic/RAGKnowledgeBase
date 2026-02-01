"use client";
import type { Message } from "@langchain/core/messages";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TestChatInterface from "@/components/chat/TestChatInterface";
import { useChatAPI, useChatState } from "@/hooks/use-chat";
import type { Document } from "@/hooks/use-documents";

interface ChatState {
	selectedDocuments: Document[];
	selectedConnectors: string[];
	searchMode: "DOCUMENTS" | "CHUNKS";
	researchMode: "QNA";
}

const getChatStateStorageKey = (searchSpaceId: string, chatId: string) =>
	`knowledgebase_chat_state_${searchSpaceId}_${chatId}`;

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
		localStorage.removeItem(key);
		try {
			return JSON.parse(stored);
		} catch {
			return null;
		}
	}
	return null;
};

/**
 * Convert backend message format to LangChain Message format
 * Backend stores messages as nested exchanges: [[userMsg, assistantMsg], ...]
 * This function flattens the structure for the frontend
 */
const convertToLangChainMessages = (apiMessages: unknown[]): Message[] => {
	const convertSingleMessage = (msg: any, index: number): Message => {
		const id = msg.id || `msg_${index}`;
		if (msg.role === "user") {
			return { type: "human", content: msg.content, id };
		}
		if (msg.role === "assistant") {
			return { type: "ai", content: msg.content, id };
		}
		return { type: "system", content: msg.content, id };
	};

	if (apiMessages.length > 0 && Array.isArray(apiMessages[0])) {
		const flatMessages = (apiMessages as any[]).flat();
		return flatMessages.map(convertSingleMessage) as Message[];
	}
	return apiMessages.map(convertSingleMessage) as Message[];
};

export default function ResearcherPage() {
	const { search_space_id, chat_id } = useParams();
	const router = useRouter();

	const chatIdParam = Array.isArray(chat_id) ? chat_id[0] : chat_id;

	const {
		token,
		isLoading,
		setIsLoading,
		searchMode,
		setSearchMode,
		selectedConnectors,
		setSelectedConnectors,
		selectedDocuments,
		setSelectedDocuments,
	} = useChatState({
		search_space_id: search_space_id as string,
		chat_id: chatIdParam,
	});

	const [messages, setMessages] = useState<Message[]>([]);
	const [currentChatId, setCurrentChatId] = useState<number | undefined>(
		chatIdParam ? Number.parseInt(chatIdParam, 10) : undefined,
	);

	const { fetchChatDetails } = useChatAPI({
		token,
		search_space_id: search_space_id as string,
	});

	useEffect(() => {
		if (token && chatIdParam) {
			setIsLoading(true);
			fetchChatDetails(chatIdParam).then((chatData) => {
				if (!chatData) {
					setIsLoading(false);
					return;
				}

				if (chatData.initial_connectors) {
					setSelectedConnectors(chatData.initial_connectors);
				}

				if (chatData.messages) {
					setMessages(convertToLangChainMessages(chatData.messages));
				}
				setIsLoading(false);
			});
		}
	}, [token, chatIdParam]);

	useEffect(() => {
		if (!chatIdParam || !search_space_id) return;

		const restoredState = restoreChatState(
			search_space_id as string,
			chatIdParam,
		);
		if (restoredState) {
			setSelectedDocuments(restoredState.selectedDocuments);
			setSelectedConnectors(restoredState.selectedConnectors);
			setSearchMode(restoredState.searchMode);
		}
	}, [
		chatIdParam,
		search_space_id,
		setSelectedDocuments,
		setSelectedConnectors,
		setSearchMode,
	]);

	const handleChatCreated = (newChatId: number) => {
		setCurrentChatId(newChatId);

		storeChatState(search_space_id as string, String(newChatId), {
			selectedDocuments,
			selectedConnectors,
			searchMode,
			researchMode: "QNA",
		});

		router.replace(`/dashboard/${search_space_id}/researcher/${newChatId}`);
	};

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
			chatId={currentChatId}
			userId={1}
			token={token}
			searchSpaceId={search_space_id as string}
			onChatCreated={handleChatCreated}
		/>
	);
}
