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
	// Controlled state props
	messages?: Message[];
	setMessages?: Dispatch<SetStateAction<Message[]>>;
	threadId?: string;
	userId?: number;
	token?: string | null;
	searchSpaceId: string;
}

// Fixed values for integration as per original component context if needed,
// but for now we default them or expect them to be provided if we want full functionality.
const DEFAULT_THREAD_ID = "default_thread";
const DEFAULT_USER_ID = 1;

export default function TestChatInterface({
	onDocumentSelectionChange,
	selectedDocuments = [],
	onConnectorSelectionChange,
	selectedConnectors = [],
	searchMode,
	onSearchModeChange,
	messages: externalMessages,
	setMessages: externalSetMessages,
	threadId = DEFAULT_THREAD_ID,
	userId = DEFAULT_USER_ID,
	token,
	searchSpaceId,
}: ChatInterfaceProps) {
	const [localMessages, setLocalMessages] = useState<Message[]>([]);
	const [inputText, setInputText] = useState("");

	// Determine if controlled or uncontrolled
	const isControlled =
		externalMessages !== undefined && externalSetMessages !== undefined;
	const messages = isControlled ? externalMessages : localMessages;
	const setMessages = isControlled ? externalSetMessages : setLocalMessages;

	const queryClient = useQueryClient();
	// Use backend API URL from config
	const endpoint = `${config.apiUrl}/agent/chat`;

	const { isStreaming, sendMessage, handleInputChange } = useChatStream({
		type: "archive",
		messages,
		setMessages,
		inputText,
		setInputText,
		threadId,
		endpoint,
		userId,
		token: token || undefined,
		searchSpaceId,
		selectedConnectors,
		searchMode,
		scrollContainerRef: { current: null }, // passed just to satisfy types if we don't use the returned ref for main container
		onStreamStart: () => console.log("Stream started"),
		onStreamFinish: () => {
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});

	// We can use the handleKeyDown from hook if we want exact behavior from snippet,
	// but ChatInputUI has its own. We should wire them up.
	// ChatInputUI expects (message: string) => void for onSubmit.
	// sendMessage from useChatStream can take an override string.

	const handleSubmit = (message: string) => {
		// We set input text to message just in case, but sendMessage(message) is better.
		// Actually sendMessage in useChatStream primarily uses state `inputText`.
		// We should ensure `inputText` is synced or pass valid arg.

		// If the component calls onSubmit, it implies the text is ready to send.
		// The default sendMessage() uses inputText state.
		// If we strictly follow the hook, we should have text in state.
		// ChatInputUI in controlled mode updates state via handleInputChange.
		// So inputText should be up to date when onSubmit is called (if triggered by enter/button).
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
