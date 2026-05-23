"use client";

import {
	ExternalLink,
	Folder,
	type LucideIcon,
	MoreHorizontal,
	RefreshCw,
	Search,
	Share,
	Star,
	Trash2,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import useAddFavoriteChat from "@/api/chats/hooks/useAddFavoriteChat";
import useRemoveFavoriteChat from "@/api/chats/hooks/useRemoveFavoriteChat";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarInput,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useDebounce } from "@/hooks/use-debounce";

const DEBOUNCE_MS = 400;
import { cn } from "@/lib/utils";

// Map of icon names to their components
const actionIconMap: Record<string, LucideIcon> = {
	ExternalLink,
	Folder,
	Share,
	Trash2,
	MoreHorizontal,
	Search,
	RefreshCw,
};

interface ChatAction {
	name: string;
	icon: string;
	onClick: () => void;
}

interface ChatItem {
	name: string;
	url: string;
	icon: LucideIcon;
	id?: number;
	search_space_id?: number;
	is_favorite?: boolean;
	actions?: ChatAction[];
}

export function NavProjects({ chats }: { chats: ChatItem[] }) {
	const { isMobile } = useSidebar();
	const router = useRouter();
	const pathname = usePathname();
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_MS);
	const [isDeleting, setIsDeleting] = useState<number | null>(null);
	const { mutate: addFavoriteChat } = useAddFavoriteChat();
	const { mutate: removeFavoriteChat } = useRemoveFavoriteChat();

	const searchSpaceId = chats[0]?.search_space_id || "";

	// Memoized filtered chats
	const filteredChats = useMemo(() => {
		if (!debouncedSearchQuery.trim()) return chats;

		return chats.filter((chat) => chat.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
	}, [chats, debouncedSearchQuery]);

	// Handle chat deletion with loading state
	const handleDeleteChat = useCallback(async (chatId: number, deleteAction: () => void) => {
		setIsDeleting(chatId);
		try {
			await deleteAction();
		} finally {
			setIsDeleting(null);
		}
	}, []);

	// Enhanced chat item component
	const ChatItemComponent = useCallback(
		({ chat }: { chat: ChatItem }) => {
			const isDeletingChat = isDeleting === chat.id;

			const dropdownActions = (chat.actions || []).filter(
				(action) => action.icon !== "Star",
			);

			const isActiveChat = pathname === chat.url;

			return (
				<SidebarMenuItem key={chat.id ? `chat-${chat.id}` : `chat-${chat.name}`} className="flex items-center gap-1">
					<SidebarMenuButton
						onClick={() => router.push(chat.url)}
						disabled={isDeletingChat}
						isActive={isActiveChat}
						className={isDeletingChat ? "opacity-50" : ""}
					>
						<chat.icon />
						<span className={`truncate max-w-[calc(100%-2rem)] ${isDeletingChat ? "opacity-50" : ""}`}>{chat.name}</span>
						{chat.is_favorite && (
							<Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0 ml-1" />
						)}
					</SidebarMenuButton>

					<span className="ml-auto peer-hover/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0 group-data-[collapsible=icon]:hidden transition-opacity">
						<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuAction showOnHover className="mr-2">
										<MoreHorizontal />
										<span className="sr-only">More</span>
									</SidebarMenuAction>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									className="w-48"
									side={isMobile ? "bottom" : "right"}
									align={isMobile ? "end" : "start"}
								>
									<DropdownMenuItem
										onClick={() => {
											if (chat.is_favorite) {
												removeFavoriteChat({ id: chat.id!, searchSpaceId: chat.search_space_id! });
											} else {
												addFavoriteChat({ id: chat.id!, searchSpaceId: chat.search_space_id! });
											}
										}}
									>
										<Star
											className={cn(
												chat.is_favorite
													? "text-yellow-500 fill-yellow-500"
													: "text-muted-foreground",
											)}
										/>
										<span>{chat.is_favorite ? "Remove favorite" : "Add favorite"}</span>
									</DropdownMenuItem>

									{dropdownActions.length > 0 && <DropdownMenuSeparator />}

									{dropdownActions.map((action) => {
										const ActionIcon = actionIconMap[action.icon] || Folder;
										const isDeleteAction = action.name.toLowerCase().includes("delete");

										return (
											<DropdownMenuItem
												key={action.name}
												onClick={() => {
													if (isDeleteAction) {
														handleDeleteChat(chat.id || 0, action.onClick);
													} else {
														action.onClick();
													}
												}}
												disabled={isDeletingChat}
												className={isDeleteAction ? "text-destructive" : ""}
											>
												<ActionIcon className="text-muted-foreground" />
												<span>{isDeletingChat && isDeleteAction ? "Deleting..." : action.name}</span>
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuContent>
							</DropdownMenu>
						</span>
				</SidebarMenuItem>
			);
		},
		[isDeleting, router, pathname, isMobile, handleDeleteChat, addFavoriteChat, removeFavoriteChat]
	);

	// Show search input if there are chats
	const showSearch = chats.length > 0;

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>Recent Chats</SidebarGroupLabel>

			{/* Search Input */}
			{showSearch && (
				<div className="px-2 pb-2">
					<SidebarInput
						placeholder="Search chats..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-8"
					/>
				</div>
			)}

			<SidebarMenu>
				{/* Chat Items */}
				{filteredChats.length > 0 ? (
					filteredChats.map((chat) => <ChatItemComponent key={chat.id || chat.name} chat={chat} />)
				) : (
					/* No results state */
					<SidebarMenuItem>
						<SidebarMenuButton disabled className="text-muted-foreground">
							<Search className="h-4 w-4" />
							<span>{searchQuery ? "No chats found" : "No recent chats"}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				)}

				{/* View All Chats */}
				{chats.length > 0 && (
					<SidebarMenuItem>
						<SidebarMenuButton onClick={() => router.push(`/dashboard/${searchSpaceId}/chats`)}>
							<MoreHorizontal />
							<span>View All Chats</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
}
