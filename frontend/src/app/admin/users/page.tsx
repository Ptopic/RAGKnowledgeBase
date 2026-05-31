"use client";

import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function AdminUsersPage() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					{/* Header */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h1 className="text-2xl font-semibold tracking-tight">
									Users
								</h1>
								<p className="text-sm text-muted-foreground">
									Manage user accounts, permissions, and access levels.
								</p>
							</div>
							<Button className="flex items-center gap-2" disabled>
								<UserPlus className="h-4 w-4" />
								Invite User
							</Button>
						</div>
					</div>

					{/* Stats */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Total Users</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									All registered accounts
								</p>
							</CardContent>
						</Card>
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Active Users</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Currently active accounts
								</p>
							</CardContent>
						</Card>
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Admins</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Superuser accounts
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Users Table Placeholder */}
					<Card className="bg-background/60 backdrop-blur-sm">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<Users className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle className="text-lg font-medium">
										User Management
									</CardTitle>
									<CardDescription>
										View and manage all user accounts in the system.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-center py-12 text-muted-foreground">
								<p className="text-sm">
									User management table will be implemented in a follow-up task.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
