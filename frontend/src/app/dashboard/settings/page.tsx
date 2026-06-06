"use client";

import {
	ArrowLeft,
	CreditCard,
	Globe,
	Loader2,
	Settings,
	Sparkles,
	AlertTriangle,
	RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useGetSubscription from "@/api/subscription/hooks/useGetSubscription";
import useGetPlans from "@/api/subscription/hooks/useGetPlans";
import useGetPlanCreditLimits from "@/api/subscription/hooks/useGetPlanCreditLimits";
import useGetPreferences from "@/api/subscription/hooks/useGetPreferences";
import useUpdatePreferences from "@/api/subscription/hooks/useUpdatePreferences";
import useCreatePortalSession from "@/api/subscription/hooks/useCreatePortalSession";
import useCreateCheckoutSession from "@/api/subscription/hooks/useCreateCheckoutSession";
import useResumeSubscription from "@/api/subscription/hooks/useResumeSubscription";
import { useSearchParams } from "next/navigation";
import type { PlanInfo } from "@/api/subscription/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANGUAGES } from "@/contracts/enums/languages";
import { formatCredits } from "@/lib/subscription/format-utils";
import CancelSubscriptionModal from "@/components/settings/cancel-subscription-modal";

const PLAN_BADGE_COLORS: Record<string, string> = {
	FREE: "bg-slate-500 text-white",
	PRO: "bg-blue-600 text-white",
	BUSINESS: "bg-purple-600 text-white",
};


function formatPrice(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
		minimumFractionDigits: 0,
	}).format(amount / 100);
}

export default function SettingsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } =
		useGetSubscription();

	// When the user returns from Stripe Checkout, the URL has
	// ?session_id=… but the webhook may not have fired yet (Stripe can
	// take a few seconds). Refetch a few times so the UI picks up the
	// new plan as soon as the webhook processes.
	const returningFromCheckout = searchParams?.get("session_id");
	useEffect(() => {
		if (!returningFromCheckout) return;
		const delays = [500, 1500, 3000, 6000];
		const timers = delays.map((d) =>
			setTimeout(() => {
				refetchSubscription();
			}, d),
		);
		return () => {
			for (const t of timers) clearTimeout(t);
		};
	}, [returningFromCheckout, refetchSubscription]);
	const { data: plans = [], isLoading: plansLoading } = useGetPlans();
	const { data: planLimitsData, isLoading: planLimitsLoading } =
		useGetPlanCreditLimits();
	const { data: preferences, isLoading: prefLoading } = useGetPreferences();
	const updatePreferences = useUpdatePreferences();
	const createPortalSession = useCreatePortalSession();
	const createCheckout = useCreateCheckoutSession();
	const resumeSubscription = useResumeSubscription();

	const [selectedLanguage, setSelectedLanguage] = useState<string>(
		preferences?.preferred_language || "English",
	);
	const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

	useEffect(() => {
		if (preferences?.preferred_language) {
			setSelectedLanguage(preferences.preferred_language);
		}
	}, [preferences?.preferred_language]);

	const handleSaveLanguage = async () => {
		try {
			await updatePreferences.mutateAsync({
				preferred_language: selectedLanguage,
			});
			toast.success("Language preference saved");
		} catch {
			toast.error("Failed to save language preference");
		}
	};

	const handleManageBilling = async () => {
		try {
			await createPortalSession.mutateAsync();
		} catch {
			toast.error("Failed to open billing portal");
		}
	};

	const handleUpgrade = async (plan: string) => {
		try {
			const result = await createCheckout.mutateAsync({ plan });
			if (result.url) window.location.href = result.url;
		} catch {
			toast.error("Failed to start checkout");
		}
	};

	const handleResume = async () => {
		try {
			await resumeSubscription.mutateAsync();
			toast.success("Subscription resumed successfully");
		} catch {
			toast.error("Failed to resume subscription");
		}
	};

	const planLimitsByPlan = new Map(
		(planLimitsData?.plans ?? []).map((p) => [p.plan, p.monthly_credit_limit]),
	);
	const plan = subscription?.plan || "FREE";
	const creditsUsed = subscription?.credits_used || 0;
	const creditLimit =
		planLimitsByPlan.get(plan) ?? subscription?.monthly_credit_limit ?? 0;
	const creditPercent = creditLimit > 0 ? Math.min((creditsUsed / creditLimit) * 100, 100) : 0;

	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					<div className="space-y-4">
						<div className="flex items-center space-x-4">
							<button
								onClick={() => router.push("/dashboard")}
								className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
								aria-label="Back to Dashboard"
								type="button"
							>
								<ArrowLeft className="h-5 w-5 text-primary" />
							</button>
							<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
								<Settings className="h-6 w-6 text-primary" />
							</div>
							<div className="space-y-1">
								<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
								<p className="text-lg text-muted-foreground">
									Manage your account preferences, subscription, and billing.
								</p>
							</div>
						</div>
						<Separator className="my-6" />
					</div>

					<Tabs defaultValue="general" className="space-y-8">
						<TabsList className="inline-flex h-auto flex-wrap gap-1">
							<TabsTrigger value="general" className="flex items-center gap-2 text-sm">
								<Globe className="h-4 w-4" />
								<span className="hidden sm:inline">General</span>
							</TabsTrigger>
							<TabsTrigger value="subscription" className="flex items-center gap-2 text-sm">
								<Sparkles className="h-4 w-4" />
								<span className="hidden sm:inline">Subscription</span>
							</TabsTrigger>
							<TabsTrigger value="billing" className="flex items-center gap-2 text-sm">
								<CreditCard className="h-4 w-4" />
								<span className="hidden sm:inline">Billing</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="general" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-lg font-medium">
										Language Preference
									</CardTitle>
									<CardDescription>
										Choose the default language for AI responses and content generation.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									{prefLoading ? (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span className="text-sm">Loading preferences...</span>
										</div>
									) : (
										<>
											<div className="space-y-2">
												<Label htmlFor="language">Preferred Language</Label>
												<Select
													value={selectedLanguage}
													onValueChange={setSelectedLanguage}
												>
													<SelectTrigger className="w-[280px]">
														<SelectValue placeholder="Select language" />
													</SelectTrigger>
													<SelectContent>
														{LANGUAGES.map((language) => (
															<SelectItem key={language.value} value={language.value}>
																{language.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<Button
												onClick={handleSaveLanguage}
												disabled={updatePreferences.isPending}
											>
												{updatePreferences.isPending && (
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												)}
												Save Preference
											</Button>
										</>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="subscription" className="space-y-6">
							{subLoading ? (
								<Card>
									<CardContent className="flex items-center justify-center py-12">
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader2 className="h-5 w-5 animate-spin" />
											<span>Loading subscription...</span>
										</div>
									</CardContent>
								</Card>
							) : (
								<>
									<Card>
										<CardHeader>
											<CardTitle className="text-lg font-medium">
												Current Plan
											</CardTitle>
											<CardDescription>
												Your subscription plan and usage details.
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="flex items-center gap-3">
												<span className="text-sm font-medium">Plan:</span>
												<Badge className={PLAN_BADGE_COLORS[plan] || "bg-slate-500 text-white"}>
													{plan}
												</Badge>
											</div>

											<div className="space-y-2">
												<div className="flex items-center justify-between text-sm">
													<span className="font-medium">Credit Usage</span>
													<span className="text-muted-foreground">
														{formatCredits(creditsUsed)} / {formatCredits(creditLimit)} credits
													</span>
												</div>
												<Progress value={creditPercent} className="h-2" />
												<p className="text-xs text-muted-foreground">
													Credits reset at the start of each billing period
												</p>
											</div>

											{subscription?.cancel_at && subscription.status === "active" && (
											<div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
												<AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
												<div className="space-y-2 flex-1">
													<p className="text-sm font-medium text-yellow-600">
														Subscription scheduled for cancellation
													</p>
													<p className="text-sm text-muted-foreground">
														Your {plan} plan will revert to Free on{" "}
														{new Date(subscription.cancel_at).toLocaleDateString("en-US", {
															month: "long",
															day: "numeric",
															year: "numeric",
														})}
														. You can continue using all features until then.
													</p>
													<Button
														variant="outline"
														size="sm"
														onClick={handleResume}
														disabled={resumeSubscription.isPending}
													>
														{resumeSubscription.isPending && (
															<Loader2 className="h-4 w-4 mr-2 animate-spin" />
														)}
														<RotateCcw className="h-4 w-4 mr-2" />
														Resume Subscription
													</Button>
												</div>
											</div>
											)}

											{plan !== "FREE" && !subscription?.cancel_at && (
												<div className="pt-2">
													<Button
														variant="outline"
														className="text-red-600 border-red-600/40 hover:bg-red-50 hover:text-red-700"
														onClick={() => setIsCancelModalOpen(true)}
													>
														Cancel subscription
													</Button>
												</div>
											)}
										</CardContent>
									</Card>

									{subscription?.current_period_start && (
										<Card>
											<CardHeader>
												<CardTitle className="text-lg font-medium">
													Billing Period
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-1 text-sm">
													<p>
														<span className="text-muted-foreground">Current period start: </span>
														{new Date(subscription.current_period_start).toLocaleDateString("en-US", {
															month: "long",
															day: "numeric",
															year: "numeric",
														})}
													</p>
													<p>
														<span className="text-muted-foreground">Current period end: </span>
														{new Date(subscription.current_period_end).toLocaleDateString("en-US", {
															month: "long",
															day: "numeric",
															year: "numeric",
														})}
													</p>
												</div>
											</CardContent>
										</Card>
									)}

									{!plansLoading && !planLimitsLoading && plans.length > 0 && (
										<Card>
											<CardHeader>
												<CardTitle className="text-lg font-medium">
													Available Plans
												</CardTitle>
												<CardDescription>
													Compare plans and choose the one that fits your needs.
												</CardDescription>
											</CardHeader>
											<CardContent>
												<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
													<Card className="border-2 border-muted">
														<CardHeader className="pb-2">
															<CardTitle className="text-base">Free</CardTitle>
															<p className="text-2xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
														</CardHeader>
														<CardContent>
															<p className="text-sm text-muted-foreground">
																{formatCredits(planLimitsByPlan.get("FREE") ?? 0)} credits/month
															</p>
														</CardContent>
													</Card>
													{[...plans].sort((a, b) => a.amount - b.amount).map((p: PlanInfo) => {
														// Prefer the DB-backed limit (admin-editable at runtime);
														// fall back to the Stripe-sourced `p.credits` only if a row
														// is missing in plan_definitions for this tier.
														const planCredits =
															planLimitsByPlan.get(p.plan) ?? p.credits;
														return (
															<Card key={p.plan} className={p.plan === plan ? "border-2 border-primary" : "border-2 border-muted"}>
																<CardHeader className="pb-2">
																	<div className="flex items-center gap-2">
																		<CardTitle className="text-base">{p.name}</CardTitle>
																		{p.plan === plan && (
																			<Badge variant="default" className="text-xs">Current</Badge>
																		)}
																	</div>
																	<p className="text-2xl font-bold">
																		{formatPrice(p.amount, p.currency)}
																		<span className="text-sm font-normal text-muted-foreground">/{p.interval}</span>
																	</p>
																</CardHeader>
																<CardContent className="space-y-2">
																	<p className="text-sm text-muted-foreground">{formatCredits(planCredits)} credits/month</p>
																	{p.description && (
																		<p className="text-xs text-muted-foreground">{p.description}</p>
																	)}
																	{p.plan !== plan && (
																		<Button
																			size="sm"
																			variant={p.amount < (plans.find((c: PlanInfo) => c.plan === plan)?.amount ?? Infinity) ? "outline" : "default"}
																			className="w-full"
																			onClick={() => handleUpgrade(p.plan)}
																		>
																			Change plan
																		</Button>
																	)}
																</CardContent>
															</Card>
														);
													})}
												</div>
											</CardContent>
										</Card>
									)}

									<CancelSubscriptionModal
										open={isCancelModalOpen}
										onOpenChange={setIsCancelModalOpen}
										periodEnd={subscription?.current_period_end ?? new Date().toISOString()}
									/>
								</>
							)}
						</TabsContent>

						<TabsContent value="billing" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-lg font-medium">
										Billing Management
									</CardTitle>
									<CardDescription>
										Manage your payment methods, invoices, and billing details.
									</CardDescription>
								</CardHeader>
								<CardContent>
									{plan === "FREE" ? (
										<div className="flex flex-col items-center justify-center py-8 text-center">
											<div className="rounded-full bg-muted p-4 mb-4">
												<CreditCard className="h-8 w-8 text-muted-foreground" />
											</div>
											<h3 className="text-lg font-semibold">No Billing Information</h3>
											<p className="text-sm text-muted-foreground max-w-sm mt-2">
												You are on the Free plan. Upgrade to a paid plan to access billing management.
											</p>
										</div>
									) : (
										<div className="space-y-4">
											<p className="text-sm text-muted-foreground">
												Manage your payment methods, view invoices, and update billing details through the Stripe Customer Portal.
											</p>
											<Button
												onClick={handleManageBilling}
												disabled={createPortalSession.isPending}
											>
												{createPortalSession.isPending && (
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
												)}
												<CreditCard className="h-4 w-4 mr-2" />
												Manage Billing
											</Button>
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
