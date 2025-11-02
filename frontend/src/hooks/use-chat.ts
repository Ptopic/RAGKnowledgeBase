import type { Message } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import chatsClientRequests from "@/api/chats/authClientRequests";
import useCreateChat from "@/api/chats/hooks/useCreateChat";
import useUpdateChat from "@/api/chats/hooks/useUpdateChat";
import type { CreateChatRequest, UpdateChatRequest } from "@/api/chats/types";
import type { ResearchMode } from "@/components/chat";
import type { Document } from "@/hooks/use-documents";

interface UseChatStateProps {
	search_space_id: string;
	chat_id?: string;
}

export function useChatState({ chat_id }: UseChatStateProps) {
	const [token, setToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [currentChatId, setCurrentChatId] = useState<string | null>(
		chat_id || null,
	);

	// Chat configuration state
	const [searchMode, setSearchMode] = useState<"DOCUMENTS" | "CHUNKS">(
		"CHUNKS",
	);
	const [researchMode, setResearchMode] = useState<ResearchMode>("QNA");
	const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
	const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);

	useEffect(() => {
		const bearerToken = localStorage.getItem("surfsense_bearer_token");
		setToken(bearerToken);
	}, []);

	return {
		token,
		setToken,
		isLoading,
		setIsLoading,
		currentChatId,
		setCurrentChatId,
		searchMode,
		setSearchMode,
		researchMode,
		setResearchMode,
		selectedConnectors,
		setSelectedConnectors,
		selectedDocuments,
		setSelectedDocuments,
	};
}

interface UseChatAPIProps {
	token: string | null;
	search_space_id: string;
}

export function useChatAPI({ token, search_space_id }: UseChatAPIProps) {
	const queryClient = useQueryClient();
	const { mutateAsync: createChatMutation } = useCreateChat();
	const { mutateAsync: updateChatMutation } = useUpdateChat();

	const fetchChatDetails = useCallback(
		async (chatId: string) => {
			if (!token) return null;

			try {
				const data = await queryClient.fetchQuery({
					queryKey: ["chatDetails", Number(chatId)],
					queryFn: () => chatsClientRequests.getChatDetails(Number(chatId)),
				});
				return data || null;
			} catch (err) {
				console.error("Error fetching chat details:", err);
				return null;
			}
		},
		[token, queryClient],
	);

	const createChat = useCallback(
		async (
			initialMessage: string,
			researchMode: ResearchMode,
			selectedConnectors: string[],
		): Promise<string | null> => {
			if (!token) {
				console.error("Authentication token not found");
				return null;
			}

			try {
				const request: CreateChatRequest = {
					type: researchMode,
					title: "Untitled Chat",
					initial_connectors: selectedConnectors,
					messages: [
						{
							id: `temp-${Date.now()}`,
							role: "user",
							content: initialMessage,
						} as Message,
					],
					search_space_id: Number(search_space_id),
				};

				const response = await createChatMutation(request);
				return response.id.toString();
			} catch (err) {
				console.error("Error creating chat:", err);
				return null;
			}
		},
		[token, search_space_id, createChatMutation],
	);

	const updateChat = useCallback(
		async (
			chatId: string,
			messages: Message[],
			researchMode: ResearchMode,
			selectedConnectors: string[],
		) => {
			if (!token) return;

			try {
				const userMessages = messages.filter((msg) => msg.role === "user");
				if (userMessages.length === 0) return;

				const title = userMessages[0].content;

				const request: UpdateChatRequest = {
					type: researchMode,
					title: title,
					initial_connectors: selectedConnectors,
					messages: messages,
					search_space_id: Number(search_space_id),
				};

				await updateChatMutation({
					id: Number(chatId),
					data: request,
				});
			} catch (err) {
				console.error("Error updating chat:", err);
			}
		},
		[token, search_space_id, updateChatMutation],
	);

	return {
		fetchChatDetails,
		createChat,
		updateChat,
	};
}
