import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import useGetPlanCreditLimits from "@/api/subscription/hooks/useGetPlanCreditLimits";
import useGetPlans from "@/api/subscription/hooks/useGetPlans";
import { formatCredits, formatPrice } from "@/lib/subscription/format-utils";
import type { PlanInfo } from "@/api/subscription/types";

interface AvailablePlansCardProps {
	currentPlan: string;
	onChangePlan: (plan: string) => void;
}

/**
 * "Available Plans" grid — Free tier + each paid tier, with the
 * current plan highlighted. Used by the user settings page and the
 * OutOfCreditsPage. Reads plan credit limits from the DB-backed
 * /subscription/plans/limits endpoint, with a fallback to the
 * Stripe-sourced `p.credits` only when a row is missing in
 * plan_definitions.
 */
export function AvailablePlansCard({
	currentPlan,
	onChangePlan,
}: AvailablePlansCardProps) {
	const { data: plans = [], isLoading: plansLoading } = useGetPlans();
	const { data: planLimitsData, isLoading: planLimitsLoading } =
		useGetPlanCreditLimits();

	if (plansLoading || planLimitsLoading || plans.length === 0) {
		return null;
	}

	const planLimitsByPlan = new Map(
		(planLimitsData?.plans ?? []).map((p) => [
			p.plan,
			p.monthly_credit_limit,
		]),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg font-medium">Available Plans</CardTitle>
				<CardDescription>
					Compare plans and choose the one that fits your needs.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Card className="border-2 border-muted">
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Free</CardTitle>
							<p className="text-2xl font-bold">
								{formatPrice(0, "eur")}
								<span className="text-sm font-normal text-muted-foreground">
									/month
								</span>
							</p>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{formatCredits(planLimitsByPlan.get("FREE") ?? 0)} credits/month
							</p>
						</CardContent>
					</Card>
					{[...plans]
						.sort((a, b) => a.amount - b.amount)
						.map((p: PlanInfo) => {
							const planCredits = planLimitsByPlan.get(p.plan) ?? p.credits;
							return (
								<Card
									key={p.plan}
									className={
										p.plan === currentPlan
											? "border-2 border-primary"
											: "border-2 border-muted"
									}
								>
									<CardHeader className="pb-2">
										<div className="flex items-center gap-2">
											<CardTitle className="text-base">{p.name}</CardTitle>
											{p.plan === currentPlan && (
												<Badge variant="default" className="text-xs">
													Current
												</Badge>
											)}
										</div>
										<p className="text-2xl font-bold">
											{formatPrice(p.amount, p.currency)}
											<span className="text-sm font-normal text-muted-foreground">
												/{p.interval}
											</span>
										</p>
									</CardHeader>
									<CardContent className="space-y-2">
										<p className="text-sm text-muted-foreground">
											{formatCredits(planCredits)} credits/month
										</p>
										{p.description && (
											<p className="text-xs text-muted-foreground">
												{p.description}
											</p>
										)}
										{p.plan !== currentPlan && (
											<Button
												size="sm"
												variant={
													p.amount <
													(plans.find((c: PlanInfo) => c.plan === currentPlan)
														?.amount ?? Infinity)
														? "outline"
														: "default"
												}
												className="w-full"
												onClick={() => onChangePlan(p.plan)}
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
	);
}
