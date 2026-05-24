"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { AccessDeniedPage } from "@/components/access-denied-page";
import { NoAccessPage } from "@/components/no-access-page";
import { AppSidebarProvider } from "@/components/sidebar/AppSidebarProvider";
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
import { useLLMPreferences } from "@/hooks/use-llm-configs";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";

interface NavItem {
	title: string;
	url: string;
	icon: string;
	items?: { title: string; url: string }[];
}

const VIEWER_RESTRICTED_SUFFIXES = [
	"/documents/upload",
	"/documents/webpage",
	"/documents/youtube",
	"/notebooks/create",
];

export function DashboardClientLayout({
	children,
	searchSpaceId,
	navSecondary,
	navMain,
}: {
	children: React.ReactNode;
	searchSpaceId: string;
	navSecondary: NavItem[];
	navMain: NavItem[];
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchSpaceIdNum = Number(searchSpaceId);

	const { loading, error, isOnboardingComplete } =
		useLLMPreferences(searchSpaceIdNum);
	const {
		data: searchSpaceData,
		isLoading: isLoadingSearchSpace,
		error: searchSpaceError,
	} = useGetSearchSpace(searchSpaceIdNum);
	const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

	const settingsPath = `/dashboard/${searchSpaceId}/settings`;
	const onboardingPath = `/dashboard/${searchSpaceId}/onboard`;

	const isOnboardingPage = pathname === onboardingPath || pathname?.startsWith(`${onboardingPath}/`);
	const isSettingsPage = pathname === settingsPath || pathname?.startsWith(`${settingsPath}/`);

	const isEditorPage = pathname?.match(/\/notebooks\/(create|\d+\/edit|\d+)$/) !== null;
	const isConnectorsPage = pathname?.includes("/connectors") && pathname?.startsWith(`/dashboard/${searchSpaceId}/connectors`);

	const isViewer = searchSpaceData?.role === "VIEWER" && !searchSpaceData?.is_owner;

	const translatedNavMain = useMemo(() => {
		if (!isViewer) return navMain;

		return navMain
			.filter((group) => group.title !== "Connectors")
			.map((group) => {
				if (group.title !== "Documents" || !group.items?.length) return group;

				return {
					...group,
					items: group.items.filter(
						(item) => !VIEWER_RESTRICTED_SUFFIXES.some((suffix) =>
							item.url.endsWith(suffix),
						),
					),
				};
			});
	}, [navMain, isViewer]);

	const translatedNavSecondary = useMemo(() => {
		return navSecondary;
	}, [navSecondary]);

	const [open, setOpen] = useState<boolean>(() => {
		try {
			const match = document.cookie.match(/(?:^|; )sidebar_state=([^;]+)/);
			if (match) return match[1] === "true";
		} catch {
			// ignore
		}
		return true;
	});

	// Non-owners skip onboarding entirely — they use the owner's predefined configs
	useEffect(() => {
		if (!hasCheckedOnboarding && !isLoadingSearchSpace && searchSpaceData && !searchSpaceData.is_owner) {
			setHasCheckedOnboarding(true);
		}
	}, [hasCheckedOnboarding, isLoadingSearchSpace, searchSpaceData]);

	useEffect(() => {
		if (isOnboardingPage || isSettingsPage) {
			setHasCheckedOnboarding(true);
			return;
		}

		// Only check once after preferences have loaded
		if (!loading && !hasCheckedOnboarding) {
			const onboardingComplete = isOnboardingComplete();
			const isOwner = searchSpaceData?.is_owner ?? false;

			// Only force onboarding for owners; non-owners use predefined configs
			if (!onboardingComplete && isOwner) {
				router.push(`/dashboard/${searchSpaceId}/onboard`);
			}

			setHasCheckedOnboarding(true);
		}
	}, [
		loading,
		isOnboardingComplete,
		isOnboardingPage,
		isSettingsPage,
		router,
		searchSpaceId,
		hasCheckedOnboarding,
		searchSpaceData?.is_owner,
	]);

	if (searchSpaceError && !isLoadingSearchSpace) {
		return <NoAccessPage />;
	}

	// Show loading screen while checking onboarding status (only for owners on first load)
	if (!hasCheckedOnboarding && loading && !isOnboardingPage && !isSettingsPage && (searchSpaceData?.is_owner ?? true)) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-4">
				<Card className="w-[350px] bg-background/60 backdrop-blur-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-xl font-medium">
							Loading Configuration
						</CardTitle>
						<CardDescription>Checking LLM preferences...</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center py-6">
						<Loader2 className="h-12 w-12 text-primary animate-spin" />
					</CardContent>
				</Card>
			</div>
		);
	}

	// Show error screen if there's an error loading preferences (only blocks owners)
	if (error && !hasCheckedOnboarding && !isOnboardingPage && !isSettingsPage && (searchSpaceData?.is_owner ?? true)) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-4">
				<Card className="w-[400px] bg-background/60 backdrop-blur-sm border-destructive/20">
					<CardHeader className="pb-2">
						<CardTitle className="text-xl font-medium text-destructive">
							Configuration Error
						</CardTitle>
						<CardDescription>Failed to load LLM configuration</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isEditorPage) {
		return <>{children}</>;
	}

	if (isConnectorsPage && isViewer) {
		return <AccessDeniedPage />;
	}

	return (
		<SidebarProvider open={open} onOpenChange={setOpen}>
			{/* Use AppSidebarProvider which fetches user, search space, and recent chats */}
			<AppSidebarProvider
				searchSpaceId={searchSpaceId}
				navSecondary={translatedNavSecondary}
				navMain={translatedNavMain}
			/>
			<SidebarInset>
				<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
					<div className="flex items-center justify-between w-full gap-2 px-4">
						<div className="flex items-center gap-2">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="h-6" />
							<DashboardBreadcrumb />
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
