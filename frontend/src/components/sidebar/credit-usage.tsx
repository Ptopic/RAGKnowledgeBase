"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import useGetSubscription from "@/api/subscription/hooks/useGetSubscription";
import { Progress } from "@/components/ui/progress";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { useSSE } from "@/hooks/useSSE";
import { formatCredits } from "@/lib/subscription/format-utils";
import { SUBSCRIPTION } from "@/shared/queryKeys";
import { DOCUMENTS_SSE_TOPIC } from "@/shared/sseTopics";

export function CreditUsage() {
	const { data: subscription, isLoading } = useGetSubscription();
	const queryClient = useQueryClient();
	const { lastEvent } = useSSE({ topic: DOCUMENTS_SSE_TOPIC });

	// Refetch credit usage whenever a document finishes processing (or
	// fails). The backend's `deductForIndexedPages` /
	// `adjustCreditsForIndexedPages` run server-side before the SSE
	// event is broadcast, so the refetch returns the post-deduction
	// balance. This component lives in the sidebar so it is mounted on
	// every dashboard page — the refetch fires no matter where the user
	// is when the document event lands.
	useEffect(() => {
		if (!lastEvent?.data) return;
		queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION] });
	}, [lastEvent, queryClient]);

	if (isLoading || !subscription) {
		return null;
	}

	const creditsUsed = subscription.credits_used ?? 0;
	const creditLimit = subscription.monthly_credit_limit ?? 0;
	const creditPercent =
		creditLimit > 0 ? Math.min((creditsUsed / creditLimit) * 100, 100) : 0;

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Credit Usage</SidebarGroupLabel>
			<SidebarGroupContent>
				<div className="space-y-2 px-2">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">
							{formatCredits(creditsUsed)} / {formatCredits(creditLimit)}{" "}
							credits
						</span>
						<span className="text-muted-foreground">
							{creditPercent.toFixed(0)}%
						</span>
					</div>
					<Progress value={creditPercent} className="h-1.5" />
					<p className="text-xs text-muted-foreground">
						Credits reset at the start of each billing period
					</p>
				</div>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
