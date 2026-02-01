"use client";

import type { Message } from "@langchain/core/messages";
import config from "@shared/config";
import { useQueryClient } from "@tanstack/react-query";
import { type Dispatch, type SetStateAction, useState } from "react";
import { ChatInputUI } from "@/components/chat/ChatInputGroup";
import { ChatMessagesUI } from "@/components/chat/ChatMessages";
import { useChatStream } from "@/hooks/use-chat-stream";
import type { Document } from "@/hooks/use-documents";

interface ChatInterfaceProps {
	onDocumentSelectionChange?: (documents: Document[]) => void;
	selectedDocuments?: Document[];
	onConnectorSelectionChange?: (connectorTypes: string[]) => void;
	selectedConnectors?: string[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
	messages: Message[];
	setMessages: Dispatch<SetStateAction<Message[]>>;
	threadId: string;
	chatId?: number;
	userId?: number;
	token?: string | null;
	searchSpaceId: string;
	onStreamStart?: () => void;
	onChatCreated?: (chatId: number) => void;
}

export default function TestChatInterface({
	onDocumentSelectionChange,
	selectedDocuments = [],
	onConnectorSelectionChange,
	selectedConnectors = [],
	searchMode,
	onSearchModeChange,
	messages,
	setMessages,
	threadId,
	chatId,
	userId = 1,
	token,
	searchSpaceId,
	onStreamStart,
	onChatCreated,
}: ChatInterfaceProps) {
	const [inputText, setInputText] = useState("");

	const queryClient = useQueryClient();
	const endpoint = `${config.apiUrl}/agent/chat`;

	const { isStreaming, sendMessage, handleInputChange } = useChatStream({
		type: "archive",
		messages,
		setMessages,
		inputText,
		setInputText,
		threadId,
		chatId,
		endpoint,
		userId,
		token: token || undefined,
		searchSpaceId,
		selectedConnectors,
		searchMode,
		scrollContainerRef: { current: null },
		onStreamStart,
		onStreamFinish: async (_messages, _userMessage, chatId) => {
			// Invalidate queries to get latest data
			queryClient.invalidateQueries({ queryKey: ["chats"] });
			if (chatId) {
				queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
			}
		},
		onChatCreated,
	});

	const handleSubmit = (message: string) => {
		sendMessage(message);
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-[calc(100dvh-80px)] flex-col">
				<ChatMessagesUI messages={messages} isLoading={isStreaming} />
				<div className="border-t p-4">
					<ChatInputUI
						onDocumentSelectionChange={onDocumentSelectionChange}
						selectedDocuments={selectedDocuments}
						onConnectorSelectionChange={onConnectorSelectionChange}
						selectedConnectors={selectedConnectors}
						searchMode={searchMode}
						onSearchModeChange={onSearchModeChange}
						onSubmit={handleSubmit}
						isLoading={isStreaming}
						value={inputText}
						onInputChange={handleInputChange}
					/>
				</div>
			</div>
		</div>
	);
}
