"use client";

import useGetSubscription from "@/api/subscription/hooks/useGetSubscription";
import { Progress } from "@/components/ui/progress";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { formatCredits } from "@/lib/subscription/format-utils";

export function CreditUsage() {
	const { data: subscription, isLoading } = useGetSubscription();

	if (isLoading || !subscription) {
		return null;
	}

	const creditsUsed = subscription.credits_used ?? 0;
	const creditLimit = subscription.monthly_credit_limit ?? 0;
	const creditPercent = creditLimit > 0 ? Math.min((creditsUsed / creditLimit) * 100, 100) : 0;

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Credit Usage</SidebarGroupLabel>
			<SidebarGroupContent>
				<div className="space-y-2 px-2">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">
							{formatCredits(creditsUsed)} / {formatCredits(creditLimit)} credits
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
