"use client";

import { CreditCard } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function AdminSubscriptionsPage() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					{/* Header */}
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

					{/* Stats */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Active Subscriptions</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Currently active plans
								</p>
							</CardContent>
						</Card>
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Total Revenue</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Monthly recurring revenue
								</p>
							</CardContent>
						</Card>
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Trialing</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Accounts in trial period
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Subscriptions Placeholder */}
					<Card className="bg-background/60 backdrop-blur-sm">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<CreditCard className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle className="text-lg font-medium">
										Subscription Management
									</CardTitle>
									<CardDescription>
										View and manage subscription plans and billing.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-center py-12 text-muted-foreground">
								<p className="text-sm">
									Subscription management features will be implemented in a follow-up task.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
