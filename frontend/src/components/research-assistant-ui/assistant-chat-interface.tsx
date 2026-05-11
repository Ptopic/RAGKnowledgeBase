"use client";

import { AssistantRuntimeProvider, useAui } from "@assistant-ui/react";
import type { BaseMessage } from "@langchain/core/messages";
import "@/components/research-assistant-ui/assistant-ui.css";
import { useEffect, useRef } from "react";
import { Thread } from "@/components/research-assistant-ui/thread";
import { useAssistantRuntime } from "@/components/research-assistant-ui/useAssistantRuntime";
import type { Document } from "@/hooks/use-documents";
import type { OrderedStreamMessage } from "@/types/chat.types";

export interface AssistantChatInterfaceProps {
	endpoint: string;
	threadId: string;
	userId: number;
	token?: string;
	searchSpaceId: string;
	selectedConnectors?: string[];
	selectedDocumentIds?: number[];
	onDocumentSelectionChange?: (documents: Document[]) => void;
	selectedDocuments?: Document[];
	onConnectorSelectionChange?: (connectorTypes: string[]) => void;
	searchMode?: "DOCUMENTS" | "CHUNKS";
	onSearchModeChange?: (mode: "DOCUMENTS" | "CHUNKS") => void;
	chatId?: number;
	articleId?: number;
	aiChatMode?: string;
	articleContent?: { title: string; ingress: string; content: string };
	selectedArticleContent?: string | null;
	setSelectedArticleContent?: (value: string | null) => void;
	initialMessages?: BaseMessage[];
	onChatCreated?: (chatId: number) => void;
	onStreamFinish?: (
		orderedMessages: OrderedStreamMessage[],
		userMessage: string,
	) => void;
	onStreamError?: (error: Error | string) => void;
	onToolComplete?: (toolName: string) => void;
	emptyMessagesPlaceholder?: React.ReactNode;
	onDiscardUserMessage?: (userMessageIndex: number) => void;
	resetVersion?: number;
}

export function AssistantChatInterface(props: AssistantChatInterfaceProps) {
	const runtime = useAssistantRuntime({
		endpoint: props.endpoint,
		threadId: props.threadId,
		userId: props.userId,
		token: props.token,
		searchSpaceId: props.searchSpaceId,
		selectedConnectors: props.selectedConnectors,
		selectedDocumentIds: props.selectedDocumentIds,
		chatId: props.chatId,
		articleId: props.articleId,
		aiChatMode: props.aiChatMode,
		articleContent: props.articleContent,
		initialMessages: props.initialMessages,
		onChatCreated: props.onChatCreated,
		onStreamFinish: props.onStreamFinish,
		onStreamError: props.onStreamError,
		onToolComplete: props.onToolComplete,
		resetVersion: props.resetVersion,
	});

	return (
		<div className="assistant-ui-root">
			<AssistantRuntimeProvider runtime={runtime}>
				<ArticleQuoteSync
					selectedArticleContent={props.selectedArticleContent}
					setSelectedArticleContent={props.setSelectedArticleContent}
				/>
				<Thread
					emptyMessagesPlaceholder={props.emptyMessagesPlaceholder}
					onDiscardUserMessage={props.onDiscardUserMessage}
					onDocumentSelectionChange={props.onDocumentSelectionChange}
					selectedDocuments={props.selectedDocuments}
					onConnectorSelectionChange={props.onConnectorSelectionChange}
					selectedConnectors={props.selectedConnectors}
					searchMode={props.searchMode}
					onSearchModeChange={props.onSearchModeChange}
				/>
			</AssistantRuntimeProvider>
		</div>
	);
}

function ArticleQuoteSync({
	selectedArticleContent,
	setSelectedArticleContent,
}: {
	selectedArticleContent?: string | null;
	setSelectedArticleContent?: (value: string | null) => void;
}) {
	const aui = useAui();
	const prevContentRef = useRef<string | null>(null);

	useEffect(() => {
		if (selectedArticleContent === prevContentRef.current) return;
		prevContentRef.current = selectedArticleContent ?? null;

		if (selectedArticleContent) {
			aui.composer().setQuote({
				text: selectedArticleContent,
				messageId: "article-selection",
			});
			setSelectedArticleContent?.(null);
		}
	}, [selectedArticleContent, setSelectedArticleContent, aui]);

	return null;
}
