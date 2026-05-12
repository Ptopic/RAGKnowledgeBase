"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useDeleteChat from "@/api/chats/hooks/useDeleteChat";
import useGetChats from "@/api/chats/hooks/useGetChats";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface AppSidebarProviderProps {
	searchSpaceId: string;
	navSecondary: {
		title: string;
		url: string;
		icon: string;
	}[];
	navMain: {
		title: string;
		url: string;
		icon: string;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
		}[];
	}[];
}

export function AppSidebarProvider({
	searchSpaceId,
	navSecondary,
	navMain,
}: AppSidebarProviderProps) {
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [chatToDelete, setChatToDelete] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [isClient, setIsClient] = useState(false);

	// Set isClient to true when component mounts on the client
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Fetch recent chats using React Query
	const {
		data: chats = [],
		isLoading: isLoadingChats,
		error: chatError,
		refetch: refetchChats,
	} = useGetChats(
		{
			search_space_id: searchSpaceId,
		},
		{
			refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
		},
	);

	// Fetch search space details using React Query
	const {
		data: searchSpace,
		isLoading: isLoadingSearchSpace,
		error: searchSpaceError,
		refetch: refetchSearchSpace,
	} = useGetSearchSpace(Number(searchSpaceId));

	// Delete chat mutation
	const { mutate: deleteChatMutation, isPending: isDeleting } = useDeleteChat({
		onSuccess: () => {
			setShowDeleteDialog(false);
			setChatToDelete(null);
		},
	});

	// Transform chats to the format expected by AppSidebar
	const recentChats = useMemo(() => {
		const sortedChats = [...chats].sort((a, b) => {
			if (a.is_favorite && !b.is_favorite) return -1;
			if (!a.is_favorite && b.is_favorite) return 1;
			return (
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);
		});

		return sortedChats.map((chat) => ({
			name: chat.title || `Chat ${chat.id}`,
			url: `/dashboard/${chat.search_space_id}/researcher/${chat.id}`,
			icon: "MessageCircleMore",
			id: chat.id,
			search_space_id: chat.search_space_id,
			is_favorite: chat.is_favorite ?? false,
			actions: [
				{
					name: "Delete",
					icon: "Trash2",
					onClick: () => {
						setChatToDelete({
							id: chat.id,
							name: chat.title || `Chat ${chat.id}`,
						});
						setShowDeleteDialog(true);
					},
				},
			],
		}));
	}, [chats]);

	// Retry function - wrapped in useCallback to prevent infinite loops
	const retryFetch = useCallback(() => {
		refetchChats();
		refetchSearchSpace();
	}, [refetchChats, refetchSearchSpace]);

	// Handle delete chat
	const handleDeleteChat = () => {
		if (!chatToDelete) return;
		deleteChatMutation(chatToDelete.id);
	};

	// Memoized fallback chats
	const fallbackChats = useMemo(() => {
		if (chatError) {
			return [
				{
					name: "Error loading chats",
					url: "#",
					icon: "AlertCircle",
					id: 0,
					search_space_id: Number(searchSpaceId),
					actions: [
						{
							name: "Retry",
							icon: "RefreshCw",
							onClick: retryFetch,
						},
					],
				},
			];
		}

		if (!isLoadingChats && recentChats.length === 0) {
			return [
				{
					name: "No recent chats",
					url: "#",
					icon: "MessageCircleMore",
					id: 0,
					search_space_id: Number(searchSpaceId),
					actions: [],
				},
			];
		}

		return [];
	}, [
		chatError,
		isLoadingChats,
		recentChats.length,
		searchSpaceId,
		retryFetch,
	]);

	// Use fallback chats if there's an error or no chats
	const displayChats = recentChats.length > 0 ? recentChats : fallbackChats;

	// Memoized updated navSecondary
	const updatedNavSecondary = useMemo(() => {
		const updated = [...navSecondary];
		if (updated.length > 0 && isClient) {
			updated[0] = {
				...updated[0],
				title:
					searchSpace?.name ||
					(isLoadingSearchSpace
						? "Loading..."
						: searchSpaceError
							? "Error loading space"
							: "Unknown search space"),
			};
		}
		return updated;
	}, [
		navSecondary,
		isClient,
		searchSpace?.name,
		isLoadingSearchSpace,
		searchSpaceError,
	]);

	// Show loading state if not client-side
	if (!isClient) {
		return (
			<AppSidebar
				navSecondary={navSecondary}
				navMain={navMain}
				RecentChats={[]}
			/>
		);
	}

	return (
		<>
			<AppSidebar
				navSecondary={updatedNavSecondary}
				navMain={navMain}
				RecentChats={displayChats}
			/>

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Trash2 className="h-5 w-5 text-destructive" />
							<span>Delete Chat</span>
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<span className="font-medium">{chatToDelete?.name}</span>? This
							action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex gap-2 sm:justify-end">
						<Button
							variant="outline"
							onClick={() => setShowDeleteDialog(false)}
							disabled={isDeleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteChat}
							disabled={isDeleting}
							className="gap-2"
						>
							{isDeleting ? (
								<>
									<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									Deleting...
								</>
							) : (
								<>
									<Trash2 className="h-4 w-4" />
									Delete
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
