"use client";

import { format } from "date-fns";
import {
	Calendar,
	CheckCircle,
	Circle,
	ExternalLink,
	MessageCircleMore,
	MoreHorizontal,
	Search,
	Star,
	Tag,
	Trash,
	Trash2,
} from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useDeleteChat from "@/api/chats/hooks/useDeleteChat";
import useBulkDeleteChats from "@/api/chats/hooks/useBulkDeleteChats";
import useGetChats from "@/api/chats/hooks/useGetChats";
import useAddFavoriteChat from "@/api/chats/hooks/useAddFavoriteChat";
import useRemoveFavoriteChat from "@/api/chats/hooks/useRemoveFavoriteChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// UI Components
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const DEBOUNCE_MS = 400;

interface ChatsPageClientProps {
	searchSpaceId: string;
}

const pageVariants: Variants = {
	initial: { opacity: 0 },
	enter: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
	exit: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
};

const chatCardVariants: Variants = {
	initial: { y: 20, opacity: 0 },
	animate: { y: 0, opacity: 1 },
	exit: { y: -20, opacity: 0 },
};

const MotionCard = motion(Card);

export default function ChatsPageClient({
	searchSpaceId,
}: ChatsPageClientProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_MS);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedType, setSelectedType] = useState<string>("all");
	const [sortOrder, setSortOrder] = useState<string>("newest");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
	const [chatToDelete, setChatToDelete] = useState<{
		id: number;
		title: string;
	} | null>(null);

	// React Query hooks
	const {
		data: chats = [],
		isLoading,
		error: queryError,
	} = useGetChats({ search_space_id: searchSpaceId });
	const { mutate: deleteChat, isPending: isDeletingChat } = useDeleteChat({
		onSuccess: () => {
			setDeleteDialogOpen(false);
			setChatToDelete(null);
		},
	});
	const { mutate: addFavoriteChat } = useAddFavoriteChat();
	const { mutate: removeFavoriteChat } = useRemoveFavoriteChat();
	const { mutate: bulkDeleteChats, isPending: isBulkDeleting } = useBulkDeleteChats();

	const searchSpaceIdNum = parseInt(searchSpaceId, 10);

	const [selectedChats, setSelectedChats] = useState<number[]>([]);
	const [selectionMode, setSelectionMode] = useState(false);

	const chatsPerPage = 9;
	const searchParams = useSearchParams();

	// Get initial page from URL params if it exists
	useEffect(() => {
		const pageParam = searchParams.get("page");
		if (pageParam) {
			const pageNumber = parseInt(pageParam, 10);
			if (!Number.isNaN(pageNumber) && pageNumber > 0) {
				setCurrentPage(pageNumber);
			}
		}
	}, [searchParams]);

	// Filter and sort chats based on search query, type, and sort order
	// Memoized to prevent unnecessary recalculations
	const filteredChats = useMemo(() => {
		let result = [...chats];

		// Filter by search term
		if (debouncedSearchQuery) {
			const query = debouncedSearchQuery.toLowerCase();
			result = result.filter((chat) =>
				chat.title.toLowerCase().includes(query),
			);
		}

		// Filter by type
		if (selectedType !== "all") {
			if (selectedType === "favorites") {
				result = result.filter((chat) => chat.is_favorite === true);
			} else if (selectedType === "non-favorites") {
				result = result.filter((chat) => chat.is_favorite !== true);
			} else {
				result = result.filter((chat) => chat.type === selectedType);
			}
		}

		// Sort chats
		result.sort((a, b) => {
			const dateA = new Date(a.created_at).getTime();
			const dateB = new Date(b.created_at).getTime();

			return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
		});

		return result;
	}, [chats, debouncedSearchQuery, selectedType, sortOrder]);

	// Calculate pagination based on filtered chats
	const totalPages = Math.max(
		1,
		Math.ceil(filteredChats.length / chatsPerPage),
	);

	// Reset to first page when total pages decrease and current page becomes invalid
	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(1);
		}
	}, [currentPage, totalPages]);

	// Function to handle chat deletion
	const handleDeleteChat = () => {
		if (!chatToDelete) return;
		deleteChat({ id: chatToDelete.id, searchSpaceId: searchSpaceIdNum });
	};

	// Function to handle bulk chat deletion
	const handleBulkDeleteChats = () => {
		if (selectedChats.length === 0) return;
		bulkDeleteChats(
			{ ids: selectedChats, search_space_id: searchSpaceIdNum },
			{
				onSettled: () => {
					setBulkDeleteDialogOpen(false);
					setSelectedChats([]);
					setSelectionMode(false);
				},
			},
		);
	};

	// Calculate pagination
	const indexOfLastChat = currentPage * chatsPerPage;
	const indexOfFirstChat = indexOfLastChat - chatsPerPage;
	const currentChats = filteredChats.slice(indexOfFirstChat, indexOfLastChat);

	// Get unique chat types for filter dropdown (memoized to prevent infinite re-renders)
	const chatTypes = useMemo(
		() => ["all", "favorites", "non-favorites", ...Array.from(new Set(chats.map((chat) => chat.type)))],
		[chats],
	);

	// Toggle chat selection
	const toggleChatSelection = (chatId: number) => {
		setSelectedChats((prev) =>
			prev.includes(chatId)
				? prev.filter((id) => id !== chatId)
				: [...prev, chatId],
		);
	};

	// Select all visible chats
	const selectAllVisibleChats = () => {
		const visibleChatIds = currentChats.map((chat) => chat.id);
		setSelectedChats((prev) => {
			const allSelected = visibleChatIds.every((id) => prev.includes(id));
			return allSelected
				? prev.filter((id) => !visibleChatIds.includes(id)) // Deselect all visible if all are selected
				: Array.from(new Set([...prev, ...visibleChatIds])); // Add all visible, ensuring no duplicates
		});
	};

	// Cancel selection mode
	const cancelSelectionMode = () => {
		setSelectionMode(false);
		setSelectedChats([]);
	};

	return (
		<motion.div
			className="container p-6 mx-auto"
			initial="initial"
			animate="enter"
			exit="exit"
			variants={pageVariants}
		>
			<div className="flex flex-col space-y-4 md:space-y-6">
				<div className="flex flex-col space-y-2">
					<h1 className="text-3xl font-bold tracking-tight">All Chats</h1>
					<p className="text-muted-foreground">
						View, search, and manage all your chats.
					</p>
				</div>

				{/* Filter and Search Bar */}
				<div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
					<div className="flex flex-1 items-center gap-2">
						<div className="relative w-full md:w-80">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search chats..."
								className="pl-8"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>

						<Select value={selectedType} onValueChange={setSelectedType}>
							<SelectTrigger className="w-full md:w-40">
								<SelectValue placeholder="Filter by type" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{chatTypes.map((type) => (
										<SelectItem key={type} value={type}>
											{type === "all"
												? "All Types"
												: type === "favorites"
													? "Favorites"
													: type === "non-favorites"
														? "Non-favorites"
														: type.charAt(0).toUpperCase() + type.slice(1)}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center gap-2">
						{selectionMode ? (
							<>
								{selectedChats.length > 0 && (
									<AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
										<AlertDialogTrigger asChild>
											<Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
												<Trash className="h-4 w-4" />
												Delete Selected
												<span className="-me-1 ms-1 inline-flex h-5 max-h-full items-center rounded border border-border bg-background px-1 text-[0.625rem] font-medium text-muted-foreground/70">
													{selectedChats.length}
												</span>
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
												<AlertDialogDescription>
													This action cannot be undone. This will permanently delete{" "}
													{selectedChats.length} selected chat
													{selectedChats.length === 1 ? "" : "s"}.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={(e) => {
														e.preventDefault();
														handleBulkDeleteChats();
													}}
													disabled={isBulkDeleting}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
												>
													{isBulkDeleting ? "Deleting..." : "Delete"}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
								<Button
									variant="outline"
									size="sm"
									onClick={selectAllVisibleChats}
									className="gap-1"
									title="Select or deselect all chats on the current page"
								>
									<CheckCircle className="h-4 w-4" />
									{currentChats.every((chat) => selectedChats.includes(chat.id))
										? "Deselect Page"
										: "Select Page"}
								</Button>
								<Button variant="ghost" size="sm" onClick={cancelSelectionMode}>
									Cancel
								</Button>
							</>
						) : (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSelectionMode(true)}
									className="gap-1"
								>
									<CheckCircle className="h-4 w-4" />
									Select
								</Button>
								<Select value={sortOrder} onValueChange={setSortOrder}>
									<SelectTrigger className="w-40">
										<SelectValue placeholder="Sort order" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="newest">Newest First</SelectItem>
											<SelectItem value="oldest">Oldest First</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</>
						)}
					</div>
				</div>

				{/* Status Messages */}
				{isLoading && (
					<div className="flex items-center justify-center h-40">
						<div className="flex flex-col items-center gap-2">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
							<p className="text-sm text-muted-foreground">Loading chats...</p>
						</div>
					</div>
				)}

				{queryError && !isLoading && (
					<div className="border border-destructive/50 text-destructive p-4 rounded-md">
						<h3 className="font-medium">Error loading chats</h3>
						<p className="text-sm">{queryError.message}</p>
					</div>
				)}

				{!isLoading && !queryError && filteredChats.length === 0 && (
					<div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
						<MessageCircleMore className="h-8 w-8 text-muted-foreground" />
						<h3 className="font-medium">No chats found</h3>
						<p className="text-sm text-muted-foreground">
							{searchQuery || selectedType !== "all"
								? "Try adjusting your search filters"
								: "Start a new chat to get started"}
						</p>
					</div>
				)}

				{/* Chat Grid */}
				{!isLoading && !queryError && filteredChats.length > 0 && (
					<AnimatePresence mode="wait">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{currentChats.map((chat, index) => (
								<MotionCard
									key={chat.id}
									variants={chatCardVariants}
									initial="initial"
									animate="animate"
									exit="exit"
									transition={{ duration: 0.2, delay: index * 0.05 }}
									className={cn(
										"overflow-hidden hover:shadow-md transition-shadow",
										selectionMode && selectedChats.includes(chat.id)
											? "ring-2 ring-primary ring-offset-2"
											: "",
									)}
									onClick={(e) => {
										if (!selectionMode) return;
										// Ignore clicks coming from interactive elements
										if (
											(e.target as HTMLElement).closest(
												"button, a, [data-stop-selection]",
											)
										)
											return;
										toggleChatSelection(chat.id);
									}}
								>
									<CardHeader className="pb-3">
										<div className="flex justify-between items-start">
											<div className="space-y-1 flex items-start gap-2">
												{selectionMode && (
													<div className="mt-1">
														{selectedChats.includes(chat.id) ? (
															<CheckCircle className="h-4 w-4 text-primary" />
														) : (
															<Circle className="h-4 w-4 text-muted-foreground" />
														)}
													</div>
												)}
												<div>
													<CardTitle className="line-clamp-1">
														{chat.title || `Chat ${chat.id}`}
													</CardTitle>
													<CardDescription>
														<span className="flex items-center gap-1">
															<Calendar className="h-3.5 w-3.5" />
															<span>
																{format(
																	new Date(chat.created_at),
																	"MMM d, yyyy",
																)}
															</span>
														</span>
													</CardDescription>
												</div>
											</div>
											{!selectionMode && (
												<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													data-stop-selection
													onClick={(e) => {
														e.stopPropagation();
														if (chat.is_favorite) {
															removeFavoriteChat({ id: chat.id, searchSpaceId: searchSpaceIdNum });
														} else {
															addFavoriteChat({ id: chat.id, searchSpaceId: searchSpaceIdNum });
														}
													}}
												>
														<Star
															className={cn(
																"h-4 w-4",
																chat.is_favorite
																	? "text-yellow-500 fill-yellow-500"
																	: "text-muted-foreground",
															)}
														/>
														<span className="sr-only">
															{chat.is_favorite ? "Remove from favorites" : "Add to favorites"}
														</span>
													</Button>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8"
																data-stop-selection
															>
																<MoreHorizontal className="h-4 w-4" />
																<span className="sr-only">Open menu</span>
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() =>
																	router.push(
																		`/dashboard/${chat.search_space_id}/researcher/${chat.id}`,
																	)
																}
															>
																<ExternalLink className="mr-2 h-4 w-4" />
																<span>View Chat</span>
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																className="text-destructive focus:text-destructive"
																onClick={(e) => {
																	e.stopPropagation();
																	setChatToDelete({
																		id: chat.id,
																		title: chat.title || `Chat ${chat.id}`,
																	});
																	setDeleteDialogOpen(true);
																}}
															>
																<Trash2 className="mr-2 h-4 w-4" />
																<span>Delete Chat</span>
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											)}
										</div>
									</CardHeader>

									<CardFooter className="flex items-center justify-between gap-2 w-full">
										<Badge variant="secondary" className="text-xs">
											<Tag className="mr-1 h-3 w-3" />
											{chat.type || "Unknown"}
										</Badge>
										<Button
											size="sm"
											onClick={() =>
												router.push(
													`/dashboard/${chat.search_space_id}/researcher/${chat.id}`,
												)
											}
										>
											<MessageCircleMore className="h-4 w-4" />
											<span>View Chat</span>
										</Button>
									</CardFooter>
								</MotionCard>
							))}
						</div>
					</AnimatePresence>
				)}

				{/* Pagination */}
				{!isLoading && !queryError && totalPages > 1 && (
					<Pagination className="mt-8">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									href={`?page=${Math.max(1, currentPage - 1)}`}
									onClick={(e) => {
										e.preventDefault();
										if (currentPage > 1) setCurrentPage(currentPage - 1);
									}}
									className={
										currentPage <= 1 ? "pointer-events-none opacity-50" : ""
									}
								/>
							</PaginationItem>

							{Array.from({ length: totalPages }).map((_, index) => {
								const pageNumber = index + 1;
								const isVisible =
									pageNumber === 1 ||
									pageNumber === totalPages ||
									(pageNumber >= currentPage - 1 &&
										pageNumber <= currentPage + 1);

								if (!isVisible) {
									// Show ellipsis at appropriate positions
									if (pageNumber === 2 || pageNumber === totalPages - 1) {
										return (
											<PaginationItem key={pageNumber}>
												<span className="flex h-9 w-9 items-center justify-center">
													...
												</span>
											</PaginationItem>
										);
									}
									return null;
								}

								return (
									<PaginationItem key={pageNumber}>
										<PaginationLink
											href={`?page=${pageNumber}`}
											onClick={(e) => {
												e.preventDefault();
												setCurrentPage(pageNumber);
											}}
											isActive={pageNumber === currentPage}
										>
											{pageNumber}
										</PaginationLink>
									</PaginationItem>
								);
							})}

							<PaginationItem>
								<PaginationNext
									href={`?page=${Math.min(totalPages, currentPage + 1)}`}
									onClick={(e) => {
										e.preventDefault();
										if (currentPage < totalPages)
											setCurrentPage(currentPage + 1);
									}}
									className={
										currentPage >= totalPages
											? "pointer-events-none opacity-50"
											: ""
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				)}
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Trash2 className="h-5 w-5 text-destructive" />
							<span>Delete Chat</span>
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete{" "}
							<span className="font-medium">{chatToDelete?.title}</span>? This
							action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex gap-2 sm:justify-end">
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							disabled={isDeletingChat}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteChat}
							disabled={isDeletingChat}
							className="gap-2"
						>
							{isDeletingChat ? (
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
		</motion.div>
	);
}
