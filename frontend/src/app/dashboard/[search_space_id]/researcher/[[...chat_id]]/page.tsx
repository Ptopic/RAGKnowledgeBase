"use client";
import type { Message } from "@langchain/core/messages";
import { Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ShareChatModal from "@/components/chat/ShareChatModal";
import TestChatInterface from "@/components/chat/TestChatInterface";
import { useChatAPI, useChatState } from "@/hooks/use-chat";
import type { Document } from "@/hooks/use-documents";
import { convertToLangChainMessages } from "@/lib/chat/message-adapter";
import { RouteCreditGate } from "@/components/route-credit-gate";

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

export default function ResearcherPage() {
	const { search_space_id, chat_id } = useParams();

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
	const [shareModalOpen, setShareModalOpen] = useState(false);

	// Refs to track current state for useEffect access without dependency issues
	const chatIdRef = useRef(currentChatId);
	const messagesRef = useRef(messages);
	const justCreatedChatIdRef = useRef<number | null>(null);

	// Sync refs with state
	useEffect(() => {
		chatIdRef.current = currentChatId;
	}, [currentChatId]);

	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	const { fetchChatDetails } = useChatAPI({
		token,
		search_space_id: search_space_id as string,
	});

	useEffect(() => {
		if (token && chatIdParam) {
			const localHasContent = messagesRef.current.length > 0;
			const isJustCreatedChat =
				justCreatedChatIdRef.current === Number.parseInt(chatIdParam, 10);

			if (!localHasContent && !isJustCreatedChat) {
				setIsLoading(true);
			}

			fetchChatDetails(chatIdParam).then((chatData) => {
				if (!chatData) {
					setIsLoading(false);
					return;
				}

				if (chatData.initial_connectors) {
					setSelectedConnectors(chatData.initial_connectors);
				}

				if (chatData.messages) {
					const uiMessages = convertToLangChainMessages(chatData.messages);

					// Preserve optimistic local stream messages until backend save catches up
					const currentChatIdState = chatIdRef.current;
					const currentMessagesState = messagesRef.current;

					const isFirstLoadOfNewChat =
						justCreatedChatIdRef.current === chatData.id ||
						(!currentChatIdState && !!chatData.id);
					const serverIsEmpty = uiMessages.length === 0;
					const localHasContent = currentMessagesState.length > 0;

					if (isFirstLoadOfNewChat && serverIsEmpty && localHasContent) {
						// Don't overwrite local messages - they will be persisted on stream finish
						setCurrentChatId(chatData.id);
						justCreatedChatIdRef.current = null;
					} else {
						setMessages(uiMessages);
						setCurrentChatId(chatData.id);
						if (justCreatedChatIdRef.current === chatData.id) {
							justCreatedChatIdRef.current = null;
						}
					}
				}
				setIsLoading(false);
			});
		}
	}, [
		token,
		chatIdParam,
		fetchChatDetails,
		setIsLoading,
		setSelectedConnectors,
	]);

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
		justCreatedChatIdRef.current = newChatId;
		setCurrentChatId(newChatId);

		storeChatState(search_space_id as string, String(newChatId), {
			selectedDocuments,
			selectedConnectors,
			searchMode,
			researchMode: "QNA",
		});

		const nextUrl = `/dashboard/${search_space_id}/researcher/${newChatId}`;
		window.history.replaceState(null, "", nextUrl);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div>Loading...</div>
			</div>
		);
	}

	return (
		<RouteCreditGate>
		<div className="relative h-full">
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
			{currentChatId && token && (
				<>
					<button
						type="button"
						onClick={() => setShareModalOpen(true)}
						className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						<Share2 className="h-4 w-4" />
						Share
					</button>
					<ShareChatModal
						chatId={currentChatId}
						open={shareModalOpen}
						onOpenChange={setShareModalOpen}
					/>
				</>
			)}
		</div>
		</RouteCreditGate>
	);
}
