"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import useGetSubscription from "@/api/subscription/hooks/useGetSubscription";
import useCreateCheckoutSession from "@/api/subscription/hooks/useCreateCheckoutSession";
import { AvailablePlansCard } from "@/components/available-plans-card";
import { formatCredits } from "@/lib/subscription/format-utils";

/**
 * Full-page "Out of credits" replacement shown when a non-admin user
 * with no remaining credits navigates to a paid feature. Mirrors the
 * style of the user settings page (Available Plans grid + Manage
 * billing shortcut) so the user gets a single, familiar flow whether
 * they hit the gate from a route or open settings manually.
 */
export function OutOfCreditsPage() {
	const router = useRouter();
	const { data: subscription } = useGetSubscription();
	const createCheckout = useCreateCheckoutSession();

	const currentPlan = subscription?.plan || "FREE";
	const creditsUsed = subscription?.credits_used ?? 0;
	const monthlyLimit = subscription?.monthly_credit_limit ?? 0;

	const handleChangePlan = (plan: string) => {
		createCheckout.mutate({ plan });
	};

	const summaryLine = useMemo(() => {
		if (monthlyLimit <= 0) {
			return "You don't have an active subscription.";
		}
		return `You have used ${formatCredits(creditsUsed)} of ${formatCredits(monthlyLimit)} credits this month.`;
	}, [creditsUsed, monthlyLimit]);

	return (
		<div className="min-h-full bg-background">
			<div className="mx-auto max-w-5xl space-y-6 p-6">
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground"
					onClick={() => router.back()}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back
				</Button>

				<Alert>
					<Sparkles className="h-4 w-4" />
					<AlertTitle>You're out of credits</AlertTitle>
					<AlertDescription>
						{summaryLine} Upgrade your plan to continue using AI-powered
						features like research chat, document ingestion, and notebook
						indexing.
					</AlertDescription>
				</Alert>

				<Card>
					<CardHeader>
						<CardTitle className="text-lg font-medium">Why this happened</CardTitle>
						<CardDescription>
							Paid features (LLM calls, embeddings, premium parse APIs)
							consume credits. The Free tier includes a monthly allowance;
							paid tiers include more.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
							<li>Chat with documents and the researcher agent</li>
							<li>Upload new documents, web pages, and YouTube transcripts</li>
							<li>Create and edit notebooks</li>
							<li>Run connector syncs (Slack, Notion, Google Calendar, etc.)</li>
						</ul>
					</CardContent>
				</Card>

				<AvailablePlansCard
					currentPlan={currentPlan}
					onChangePlan={handleChangePlan}
				/>
			</div>
		</div>
	);
}

export default OutOfCreditsPage;
