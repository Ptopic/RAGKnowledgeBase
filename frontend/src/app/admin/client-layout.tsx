"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import useGetCurrentUser from "@/api/users/hooks/useGetCurrentUser";
import { AccessDeniedPage } from "@/components/access-denied-page";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ThemeTogglerComponent } from "@/components/theme/theme-toggle";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { COOKIE_NAME } from "@/shared/constants/cookies";

const adminNavMain = [
	{
		title: "Admin",
		url: "#",
		icon: "Shield",
		isActive: true,
		items: [
			{
				title: "Users",
				url: "/admin/users",
			},
			{
				title: "System",
				url: "/admin/system",
			},
			{
				title: "Subscriptions",
				url: "/admin/subscriptions",
			},
		],
	},
];

const adminNavSecondary = [
	{
		title: "Back to Dashboard",
		url: "/dashboard",
		icon: "Undo2",
	},
];

export function AdminClientLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { data: currentUser, isLoading: isLoadingUser } = useGetCurrentUser();
	const isSuperuser = currentUser?.isSuperuser ?? false;

	const [open, setOpen] = useState<boolean>(() => {
		if (typeof document === "undefined") return true;
		try {
			const match = document.cookie.match(
				new RegExp(`(?:^|; )${COOKIE_NAME.SIDEBAR_STATE}=([^;]+)`),
			);
			if (match) return match[1] === "true";
		} catch {
			// ignore
		}
		return true;
	});

	const activePage = useMemo(() => {
		if (pathname === "/admin/users") return "Users";
		if (pathname === "/admin/system") return "System";
		if (pathname === "/admin/subscriptions") return "Subscriptions";
		return "Admin";
	}, [pathname]);

	// Show loading while checking user permissions
	if (isLoadingUser) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-4">
				<Card className="w-[350px] bg-background/60 backdrop-blur-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-xl font-medium">
							Loading
						</CardTitle>
						<CardDescription>Checking permissions...</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center py-6">
						<Loader2 className="h-12 w-12 text-primary animate-spin" />
					</CardContent>
				</Card>
			</div>
		);
	}

	// Client-side guard for UX — all admin API endpoints MUST validate isSuperuser server-side
	if (!isSuperuser) {
		return <AccessDeniedPage />;
	}

	return (
		<SidebarProvider open={open} onOpenChange={setOpen}>
			<AppSidebar
				navMain={adminNavMain}
				navSecondary={adminNavSecondary}
			/>
			<SidebarInset>
				<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
					<div className="flex items-center justify-between w-full gap-2 px-4">
						<div className="flex items-center gap-2">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="h-6" />
							<DashboardBreadcrumb />
							<span className="text-sm font-medium text-muted-foreground">
								Admin / {activePage}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<ThemeTogglerComponent />
						</div>
					</div>
				</header>
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
