"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type { BaseMessage } from "@langchain/core/messages";
import "@/components/assistant-ui/assistant-ui.css";
import { RuntimeThread } from "@/components/assistant-ui/runtime-thread";
import { useAssistantRuntime } from "@/components/assistant-ui/useAssistantRuntime";
import type { OrderedStreamMessage } from "@/types/chat.types";

export interface AssistantChatInterfaceProps {
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

export function AssistantChatInterface(props: AssistantChatInterfaceProps) {
	const runtime = useAssistantRuntime({
		endpoint: props.endpoint,
		threadId: props.threadId,
		searchSpaceId: props.searchSpaceId,
		token: props.token,
		chatId: props.chatId,
		selectedConnectors: props.selectedConnectors,
		selectedDocumentIds: props.selectedDocumentIds,
		initialMessages: props.initialMessages,
		onChatCreated: props.onChatCreated,
		onStreamFinish: props.onStreamFinish,
		onStreamError: props.onStreamError,
	});

	return (
		<div className="assistant-ui-root h-full">
			<AssistantRuntimeProvider runtime={runtime}>
				<RuntimeThread />
			</AssistantRuntimeProvider>
		</div>
	);
}
