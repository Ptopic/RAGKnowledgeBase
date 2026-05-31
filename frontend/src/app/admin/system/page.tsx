"use client";

import { Server } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function AdminSystemPage() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					{/* Header */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h1 className="text-2xl font-semibold tracking-tight">
									System
								</h1>
								<p className="text-sm text-muted-foreground">
									Monitor system health, configuration, and runtime settings.
								</p>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Uptime</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									System uptime
								</p>
							</CardContent>
						</Card>
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Version</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Current deployment version
								</p>
							</CardContent>
						</Card>
						<Card className="bg-background/60 backdrop-blur-sm">
							<CardHeader className="pb-2">
								<CardDescription>Status</CardDescription>
								<CardTitle className="text-2xl">—</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Overall system status
								</p>
							</CardContent>
						</Card>
					</div>

					{/* System Info Placeholder */}
					<Card className="bg-background/60 backdrop-blur-sm">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
									<Server className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle className="text-lg font-medium">
										System Information
									</CardTitle>
									<CardDescription>
										Runtime configuration and health monitoring.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-center py-12 text-muted-foreground">
								<p className="text-sm">
									System management features will be implemented in a follow-up task.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
