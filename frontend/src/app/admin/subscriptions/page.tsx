"use client";

import {
	AlertCircle,
	CreditCard,
	DollarSign,
	ExternalLink,
	Loader2,
	RefreshCw,
	RotateCcw,
	Search,
	Shield,
	Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useGetAdminSubscriptions from "@/api/subscription/hooks/useGetAdminSubscriptions";
import useAdminOverridePlan from "@/api/subscription/hooks/useAdminOverridePlan";
import useAdminResetCredits from "@/api/subscription/hooks/useAdminResetCredits";
import type { AdminSubscriptionUser } from "@/api/subscription/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const PLAN_BADGE_COLORS: Record<string, string> = {
	FREE: "bg-slate-500 text-white",
	PRO: "bg-blue-600 text-white",
	BUSINESS: "bg-purple-600 text-white",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
	active: "bg-green-600 text-white",
	past_due: "bg-amber-600 text-white",
	canceled: "bg-red-600 text-white",
	trialing: "bg-sky-600 text-white",
};

const PLANS = ["FREE", "PRO", "BUSINESS"] as const;

export default function AdminSubscriptionsPage() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const { data, isLoading, error, refetch } = useGetAdminSubscriptions({
		skip: 0,
		limit: 100,
		search: debouncedSearch || undefined,
	});

	const overridePlanMutation = useAdminOverridePlan();
	const resetCreditsMutation = useAdminResetCredits();

	const [overrideUser, setOverrideUser] = useState<AdminSubscriptionUser | null>(null);
	const [selectedPlan, setSelectedPlan] = useState<string>("FREE");
	const [resetCreditsUser, setResetCreditsUser] = useState<AdminSubscriptionUser | null>(null);

	const users = data?.users ?? [];
	const total = data?.total ?? 0;
	const activeSubscriptions = data?.active_subscriptions ?? 0;
	const totalRevenue = data?.total_revenue ?? "N/A";
	const freeTierCount = data?.free_tier_count ?? 0;

	const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		searchTimerRef.current = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);
		return () => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		};
	}, [search]);

	const handleOverridePlan = async () => {
		if (!overrideUser) return;
		try {
			await overridePlanMutation.mutateAsync({
				userId: overrideUser.id,
				plan: selectedPlan,
			});
			toast.success(`Plan updated to ${selectedPlan} for ${overrideUser.email}`);
			setOverrideUser(null);
			refetch();
		} catch {
			toast.error("Failed to override plan");
		}
	};

	const handleResetCredits = async () => {
		if (!resetCreditsUser) return;
		try {
			await resetCreditsMutation.mutateAsync({
				userId: resetCreditsUser.id,
			});
			toast.success(`Credits reset for ${resetCreditsUser.email}`);
			setResetCreditsUser(null);
			refetch();
		} catch {
			toast.error("Failed to reset credits");
		}
	};

	const openOverrideDialog = (user: AdminSubscriptionUser) => {
		setOverrideUser(user);
		setSelectedPlan(user.plan);
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h1 className="text-2xl font-semibold tracking-tight">
									Subscriptions
								</h1>
								<p className="text-sm text-muted-foreground">
									Manage subscription plans, billing, and usage limits.
								</p>
							</div>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Card className="border-l-4 border-l-blue-500">
							<CardContent className="p-6">
								<div className="flex items-center justify-between space-x-4">
									<div className="space-y-1">
										<p className="text-3xl font-bold tracking-tight">
											{activeSubscriptions}
										</p>
										<p className="text-sm font-medium text-muted-foreground">
											Active Subscriptions
										</p>
									</div>
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
										<Users className="h-6 w-6 text-blue-600" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card className="border-l-4 border-l-green-500">
							<CardContent className="p-6">
								<div className="flex items-center justify-between space-x-4">
									<div className="space-y-1">
										<p className="text-3xl font-bold tracking-tight">
											{totalRevenue}
										</p>
										<p className="text-sm font-medium text-muted-foreground">
											Revenue Tracking
										</p>
									</div>
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
										<DollarSign className="h-6 w-6 text-green-600" />
									</div>
								</div>
							</CardContent>
						</Card>
						<Card className="border-l-4 border-l-amber-500">
							<CardContent className="p-6">
								<div className="flex items-center justify-between space-x-4">
									<div className="space-y-1">
										<p className="text-3xl font-bold tracking-tight">
											{freeTierCount}
										</p>
										<p className="text-sm font-medium text-muted-foreground">
											Free Tier
										</p>
									</div>
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
										<Shield className="h-6 w-6 text-amber-600" />
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error.message}</AlertDescription>
						</Alert>
					)}

					<Card>
						<CardHeader>
							<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
										<CreditCard className="h-5 w-5 text-primary" />
									</div>
									<div>
										<CardTitle className="text-lg font-medium">
											Subscription Management
										</CardTitle>
										<CardDescription>
											{total} user{total !== 1 ? "s" : ""} with subscriptions
										</CardDescription>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Search by email or name..."
											value={search}
											onChange={(e) => setSearch(e.target.value)}
											className="pl-9 w-[250px]"
										/>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => refetch()}
										disabled={isLoading}
										className="flex items-center gap-2"
									>
										<RefreshCw
											className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
										/>
										Refresh
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="flex items-center justify-center py-12">
									<div className="flex items-center gap-2 text-muted-foreground">
										<Loader2 className="h-5 w-5 animate-spin" />
										<span>Loading subscriptions...</span>
									</div>
								</div>
							) : users.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 text-center">
									<div className="rounded-full bg-muted p-4 mb-6">
										<CreditCard className="h-10 w-10 text-muted-foreground" />
									</div>
									<h3 className="text-xl font-semibold">No Subscriptions Found</h3>
									<p className="text-muted-foreground max-w-sm mt-2">
										{debouncedSearch
											? "No users match your search criteria."
											: "No subscription data available yet."}
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>User</TableHead>
											<TableHead>Plan</TableHead>
											<TableHead>Credits</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Stripe ID</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<AnimatePresence>
											{users.map((user) => {
												const creditPercent =
													user.monthly_credit_limit > 0
														? Math.min(
																(user.credits_used / user.monthly_credit_limit) * 100,
																100,
															)
														: 0;

												return (
													<motion.tr
														key={user.id}
														initial={{ opacity: 0, y: 10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: -10 }}
														transition={{ duration: 0.2 }}
														className="hover:bg-muted/50 border-b transition-colors"
													>
														<TableCell>
															<div className="flex flex-col">
																<span className="font-medium text-sm">
																	{user.full_name || user.email}
																</span>
																<span className="text-xs text-muted-foreground">
																	{user.email}
																</span>
															</div>
														</TableCell>
														<TableCell>
															<Badge
																className={
																	PLAN_BADGE_COLORS[user.plan] ||
																	"bg-slate-500 text-white"
																}
															>
																{user.plan}
															</Badge>
														</TableCell>
														<TableCell>
															<div className="space-y-1 min-w-[120px]">
																<div className="flex items-center justify-between text-xs">
																	<span>
																		{user.credits_used}/{user.monthly_credit_limit}
																	</span>
																</div>
																<Progress value={creditPercent} className="h-1.5" />
															</div>
														</TableCell>
														<TableCell>
															<Badge
																className={
																	STATUS_BADGE_COLORS[user.status] ||
																	"bg-slate-500 text-white"
																}
															>
																{user.status}
															</Badge>
														</TableCell>
														<TableCell>
															{user.stripe_customer_id ? (
																<a
																	href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-xs text-blue-600 hover:underline flex items-center gap-1"
																>
																	{user.stripe_customer_id.slice(0, 12)}...
																	<ExternalLink className="h-3 w-3" />
																</a>
															) : (
																<span className="text-xs text-muted-foreground">
																	None
																</span>
															)}
														</TableCell>
														<TableCell className="text-right">
															<div className="flex items-center justify-end gap-1">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => openOverrideDialog(user)}
																	className="h-8 px-2 text-xs"
																>
																	<Shield className="h-3 w-3 mr-1" />
																	Override Plan
																</Button>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => setResetCreditsUser(user)}
																	className="h-8 px-2 text-xs"
																>
																	<RotateCcw className="h-3 w-3 mr-1" />
																	Reset Credits
																</Button>
															</div>
														</TableCell>
													</motion.tr>
												);
											})}
										</AnimatePresence>
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{/* Override Plan Dialog */}
					<Dialog
						open={!!overrideUser}
						onOpenChange={(open) => {
							if (!open) setOverrideUser(null);
						}}
					>
						<DialogContent className="max-w-lg">
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<Shield className="w-5 h-5" />
									Override Plan
								</DialogTitle>
								<DialogDescription>
									Change the subscription plan for {overrideUser?.email}. This will
									immediately update their plan and credit limits.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="plan-select">New Plan</Label>
									<Select value={selectedPlan} onValueChange={setSelectedPlan}>
										<SelectTrigger id="plan-select">
											<SelectValue placeholder="Select a plan" />
										</SelectTrigger>
										<SelectContent>
											{PLANS.map((plan) => (
												<SelectItem key={plan} value={plan}>
													<div className="flex items-center gap-2">
														<Badge
															className={
																PLAN_BADGE_COLORS[plan] || "bg-slate-500 text-white"
															}
														>
															{plan}
														</Badge>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									type="button"
									onClick={() => setOverrideUser(null)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									onClick={handleOverridePlan}
									disabled={overridePlanMutation.isPending}
								>
									{overridePlanMutation.isPending && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									Update Plan
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Reset Credits Confirmation */}
					<AlertDialog
						open={!!resetCreditsUser}
						onOpenChange={(open) => {
							if (!open) setResetCreditsUser(null);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Reset Credits</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to reset credits for &quot;{resetCreditsUser?.email}&quot;?
									This will set their credits_used back to 0.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleResetCredits}
									className="bg-amber-600 text-white hover:bg-amber-700"
								>
									{resetCreditsMutation.isPending && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									Reset Credits
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}
