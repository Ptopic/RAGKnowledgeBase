"use client";

import type { BaseMessage } from "@langchain/core/messages";
import config from "@shared/config";
import { useQueryClient } from "@tanstack/react-query";
import { type Dispatch, type SetStateAction, useMemo } from "react";
import { AssistantChatInterface } from "@/components/research-assistant-ui/assistant-chat-interface";
import type { Document } from "@/hooks/use-documents";
import { SUBSCRIPTION } from "@/shared/queryKeys";

interface ChatInterfaceProps {
	onDocumentSelectionChange?: (documents: Document[]) => void;
	selectedDocuments?: Document[];
	onConnectorSelectionChange?: (connectorTypes: string[]) => void;
	selectedConnectors?: string[];
	searchMode?: "DOCUMENTS" | "CHUNKS";
	onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
	messages: BaseMessage[];
	setMessages: Dispatch<SetStateAction<BaseMessage[]>>;
	threadId: string;
	chatId?: number;
	userId?: number;
	token?: string | null;
	searchSpaceId: string;
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
	threadId,
	chatId,
	token,
	searchSpaceId,
	onChatCreated,
}: ChatInterfaceProps) {
	const queryClient = useQueryClient();
	const endpoint = `${config.apiUrl}/agent/chatWithDeepAgent`;
	const selectedDocumentIds = useMemo(
		() => (selectedDocuments || []).map((d) => d.id),
		[selectedDocuments],
	);

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-[calc(100dvh-80px)] flex-col">
				<AssistantChatInterface
					endpoint={endpoint}
					threadId={threadId}
					userId={1}
					token={token || undefined}
					searchSpaceId={searchSpaceId}
					selectedConnectors={selectedConnectors}
					selectedDocumentIds={selectedDocumentIds}
					chatId={chatId}
					initialMessages={messages}
					onChatCreated={onChatCreated}
					onDocumentSelectionChange={onDocumentSelectionChange}
					selectedDocuments={selectedDocuments}
					onConnectorSelectionChange={onConnectorSelectionChange}
					searchMode={searchMode}
					onSearchModeChange={onSearchModeChange}
					onStreamFinish={(_orderedMessages, _userMessage) => {
						queryClient.invalidateQueries({ queryKey: ["chats"] });
						if (chatId) {
							queryClient.invalidateQueries({
								queryKey: ["chatDetails", chatId],
							});
						}
						// Backend enqueues credit deduction in
						// `subscriptionService.enqueueDeduction` after the
						// stream ends (see agent.controller.ts). Refetching
						// here gives the sidebar a real-time credit display.
						queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION] });
					}}
				/>
			</div>
		</div>
	);
}
