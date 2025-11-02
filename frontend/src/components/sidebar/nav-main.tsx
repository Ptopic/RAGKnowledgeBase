"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { useMemo } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface NavItem {
	title: string;
	url: string;
	icon: LucideIcon;
	isActive?: boolean;
	items?: {
		title: string;
		url: string;
	}[];
}

export function NavMain({ items }: { items: NavItem[] }) {
	// Memoize items to prevent unnecessary re-renders
	const memoizedItems = useMemo(() => items, [items]);

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Platform</SidebarGroupLabel>
			<SidebarMenu>
				{memoizedItems.map((item, index) => {
					const hasSub = !!item.items?.length;
					return (
						<Collapsible key={`${item.title}-${index}`} asChild defaultOpen={item.isActive}>
							<SidebarMenuItem>
								{hasSub ? (
									// When the item has children, make the whole row a collapsible trigger
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton
												asChild
												tooltip={item.title}
												isActive={item.isActive}
												aria-label={`${item.title} with submenu`}
											>
												<button type="button" className="flex items-center gap-2 w-full text-left">
													<item.icon />
													<span>{item.title}</span>
												</button>
											</SidebarMenuButton>
										</CollapsibleTrigger>

										<CollapsibleTrigger asChild>
											<SidebarMenuAction
												className="data-[state=open]:rotate-90 transition-transform duration-200"
												aria-label={`Toggle ${item.title} submenu`}
											>
												<ChevronRight />
												<span className="sr-only">Toggle submenu</span>
											</SidebarMenuAction>
										</CollapsibleTrigger>

										<CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 duration-200">
											<SidebarMenuSub>
												{item.items?.map((subItem, subIndex) => {
													return (
														<SidebarMenuSubItem key={`${subItem.title}-${subIndex}`}>
															<SidebarMenuSubButton asChild aria-label={subItem.title}>
																<a href={subItem.url}>
																	<span>{subItem.title}</span>
																</a>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													);
												})}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								) : (
									// Leaf item: treat as a normal link
									<SidebarMenuButton
										asChild
										tooltip={item.title}
										isActive={item.isActive}
										aria-label={item.title}
									>
										<a href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								)}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
