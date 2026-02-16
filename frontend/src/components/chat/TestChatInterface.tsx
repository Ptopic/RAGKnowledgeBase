"use client";

import type { Message } from "@langchain/core/messages";
import config from "@shared/config";
import { useQueryClient } from "@tanstack/react-query";
import { type Dispatch, type SetStateAction, useState } from "react";
import { Thread } from "@/components/assistant-ui";
import { ChatHeader } from "@/components/new-chat/chat-header";
import { useChatStream } from "@/hooks/use-chat-stream";
import type { Document } from "@/hooks/use-documents";
import { messageContentToText } from "@/lib/chat/message-adapter";

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
	chatId,
	token,
	searchSpaceId,
	onStreamStart,
	onChatCreated,
}: ChatInterfaceProps) {
	const [inputText, setInputText] = useState("");

	const queryClient = useQueryClient();
	const endpoint = `${config.apiUrl}/agent/chatWithDeepAgent`;

	const { isStreaming, sendMessage, stopStreaming, toolCallsByMessage } = useChatStream({
		messages,
		setMessages,
		inputText,
		setInputText,
		chatId,
		endpoint,
		token: token || undefined,
		searchSpaceId,
		selectedConnectors,
		selectedDocuments,
		scrollContainerRef: { current: null },
		onStreamStart,
		onStreamFinish: async (_messages, _userMessage, chatId) => {
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

	const handleReloadLast = () => {
		const lastUserMessage = [...messages].reverse().find((message) => message.type === "human");
		if (!lastUserMessage) return;
		sendMessage(messageContentToText(lastUserMessage.content));
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-[calc(100dvh-80px)] flex-col">
				<Thread
					messages={messages}
					isRunning={isStreaming}
					onSubmit={handleSubmit}
					onCancel={stopStreaming}
					onReloadLast={handleReloadLast}
					searchSpaceId={Number.parseInt(searchSpaceId, 10)}
					header={<ChatHeader />}
					onDocumentSelectionChange={onDocumentSelectionChange}
					selectedDocuments={selectedDocuments}
					onConnectorSelectionChange={onConnectorSelectionChange}
					selectedConnectors={selectedConnectors}
					searchMode={searchMode}
					onSearchModeChange={onSearchModeChange}
					toolCallsByMessage={toolCallsByMessage}
				/>
			</div>
		</div>
	);
}
