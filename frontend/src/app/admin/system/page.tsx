"use client";

import {
	AlertCircle,
	BarChart3,
	CheckCircle,
	Crown,
	Database,
	FileText,
	Loader2,
	MessageSquare,
	RefreshCw,
	Search,
	Server,
	Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import useGetAdminMetrics from "@/api/admin/hooks/useGetAdminMetrics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const formatDate = (dateStr: string) => {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

const formatPercent = (used: number, limit: number) => {
	if (limit === 0) return "0%";
	return `${Math.round((used / limit) * 100)}%`;
};

const getUsageColor = (used: number, limit: number) => {
	const pct = limit === 0 ? 0 : used / limit;
	if (pct >= 0.9) return "text-red-600";
	if (pct >= 0.7) return "text-amber-600";
	return "text-green-600";
};

export default function AdminSystemPage() {
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const { data, isLoading, error, refetch } = useGetAdminMetrics({
		skip: 0,
		limit: 100,
		search: debouncedSearch || undefined,
	});

	const handleSearch = useCallback(
		(value: string) => {
			setSearch(value);
			const timer = setTimeout(() => {
				setDebouncedSearch(value);
			}, 300);
			return () => clearTimeout(timer);
		},
		[],
	);

	const metrics = data;
	const userUsage = data?.userUsage ?? [];

	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h1 className="text-2xl font-semibold tracking-tight">
									System
								</h1>
								<p className="text-sm text-muted-foreground">
									Monitor system health, usage statistics, and user page consumption.
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => refetch()}
								disabled={isLoading}
								className="flex items-center gap-2"
							>
								<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
								Refresh
							</Button>
						</div>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error.message}</AlertDescription>
						</Alert>
					)}

					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="flex items-center gap-2 text-muted-foreground">
								<Loader2 className="h-5 w-5 animate-spin" />
								<span>Loading system metrics...</span>
							</div>
						</div>
					) : (
						<>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								<Card className="border-l-4 border-l-blue-500">
									<CardContent className="p-6">
										<div className="flex items-center justify-between space-x-4">
											<div className="space-y-1">
												<p className="text-3xl font-bold tracking-tight">{metrics?.totalUsers ?? 0}</p>
												<p className="text-sm font-medium text-muted-foreground">Total Users</p>
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
												<p className="text-3xl font-bold tracking-tight">{metrics?.activeUsers ?? 0}</p>
												<p className="text-sm font-medium text-muted-foreground">Active Users</p>
											</div>
											<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
												<CheckCircle className="h-6 w-6 text-green-600" />
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="border-l-4 border-l-amber-500">
									<CardContent className="p-6">
										<div className="flex items-center justify-between space-x-4">
											<div className="space-y-1">
												<p className="text-3xl font-bold tracking-tight">{metrics?.superusers ?? 0}</p>
												<p className="text-sm font-medium text-muted-foreground">Admins</p>
											</div>
											<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
												<Crown className="h-6 w-6 text-amber-600" />
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="border-l-4 border-l-purple-500">
									<CardContent className="p-6">
										<div className="flex items-center justify-between space-x-4">
											<div className="space-y-1">
												<p className="text-3xl font-bold tracking-tight">{metrics?.totalSearchSpaces ?? 0}</p>
												<p className="text-sm font-medium text-muted-foreground">Search Spaces</p>
											</div>
											<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
												<Database className="h-6 w-6 text-purple-600" />
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="border-l-4 border-l-cyan-500">
									<CardContent className="p-6">
										<div className="flex items-center justify-between space-x-4">
											<div className="space-y-1">
												<p className="text-3xl font-bold tracking-tight">{metrics?.totalDocuments ?? 0}</p>
												<p className="text-sm font-medium text-muted-foreground">Documents</p>
											</div>
											<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10">
												<FileText className="h-6 w-6 text-cyan-600" />
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="border-l-4 border-l-pink-500">
									<CardContent className="p-6">
										<div className="flex items-center justify-between space-x-4">
											<div className="space-y-1">
												<p className="text-3xl font-bold tracking-tight">{metrics?.totalChats ?? 0}</p>
												<p className="text-sm font-medium text-muted-foreground">Chats</p>
											</div>
											<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/10">
												<MessageSquare className="h-6 w-6 text-pink-600" />
											</div>
										</div>
									</CardContent>
								</Card>
							</div>

							<Card className="border-l-4 border-l-indigo-500">
								<CardContent className="p-6">
									<div className="space-y-4">
										<div className="flex items-center gap-2">
											<BarChart3 className="h-5 w-5 text-indigo-600" />
											<h3 className="text-lg font-semibold tracking-tight">Page Usage Overview</h3>
										</div>
										<div className="grid gap-4 md:grid-cols-2">
											<div>
												<p className="text-sm text-muted-foreground">Total Pages Used</p>
												<p className="text-2xl font-bold">{metrics?.totalPagesUsed ?? 0}</p>
											</div>
											<div>
												<p className="text-sm text-muted-foreground">Total Pages Limit</p>
												<p className="text-2xl font-bold">{metrics?.totalPagesLimit ?? 0}</p>
											</div>
										</div>
										{metrics && metrics.totalPagesLimit > 0 && (
											<div className="w-full bg-muted rounded-full h-2.5">
												<div
													className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
													style={{
														width: `${Math.min(100, (metrics.totalPagesUsed / metrics.totalPagesLimit) * 100)}%`,
													}}
												/>
											</div>
										)}
										<p className="text-sm text-muted-foreground">
											{formatPercent(metrics?.totalPagesUsed ?? 0, metrics?.totalPagesLimit ?? 1)} of total allocated pages used
										</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
												<Server className="h-5 w-5 text-primary" />
											</div>
											<div>
												<CardTitle className="text-lg font-medium">
													User Usage Details
												</CardTitle>
												<CardDescription>
													{data?.userUsageTotal ?? 0} user{(data?.userUsageTotal ?? 0) !== 1 ? "s" : ""} tracked
												</CardDescription>
											</div>
										</div>
										<div className="relative">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											<Input
												placeholder="Search by email or name..."
												value={search}
												onChange={(e) => handleSearch(e.target.value)}
												className="pl-9 w-[250px]"
											/>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									{userUsage.length === 0 ? (
										<div className="flex flex-col items-center justify-center py-16 text-center">
											<div className="rounded-full bg-muted p-4 mb-6">
												<Server className="h-10 w-10 text-muted-foreground" />
											</div>
											<h3 className="text-xl font-semibold">No Users Found</h3>
											<p className="text-muted-foreground max-w-sm mt-2">
												{debouncedSearch
													? "No users match your search criteria."
													: "No user data available yet."}
											</p>
										</div>
									) : (
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>User</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>Role</TableHead>
													<TableHead>Pages Used</TableHead>
													<TableHead>Pages Limit</TableHead>
													<TableHead>Usage</TableHead>
													<TableHead>Lock Status</TableHead>
													<TableHead>Last Updated</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												<AnimatePresence>
													{userUsage.map((user) => (
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
																		{user.fullName ?? user.email}
																	</span>
																	<span className="text-xs text-muted-foreground">{user.email}</span>
																</div>
															</TableCell>
															<TableCell>
																<Badge className={user.isActive ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
																	{user.isActive ? "Active" : "Disabled"}
																</Badge>
															</TableCell>
															<TableCell>
																<Badge variant={user.isSuperuser ? "default" : "outline"}>
																	{user.isSuperuser ? "Admin" : "User"}
																</Badge>
															</TableCell>
															<TableCell>
																<span className={`font-medium ${getUsageColor(user.pagesUsed, user.pagesLimit)}`}>
																	{user.pagesUsed}
																</span>
															</TableCell>
															<TableCell>
																<span className="text-sm">{user.pagesLimit}</span>
															</TableCell>
															<TableCell>
																<div className="flex items-center gap-2">
																	<div className="w-16 bg-muted rounded-full h-1.5">
																		<div
																			className={`h-1.5 rounded-full transition-all ${
																				user.pagesUsed / (user.pagesLimit || 1) >= 0.9
																					? "bg-red-500"
																					: user.pagesUsed / (user.pagesLimit || 1) >= 0.7
																						? "bg-amber-500"
																						: "bg-green-500"
																			}`}
																			style={{
																				width: `${Math.min(100, (user.pagesUsed / (user.pagesLimit || 1)) * 100)}%`,
																			}}
																		/>
																	</div>
																	<span className="text-xs text-muted-foreground">
																		{formatPercent(user.pagesUsed, user.pagesLimit)}
																	</span>
																</div>
															</TableCell>
															<TableCell>
																{user.lockedUntil ? (
																	<Badge variant="destructive" className="text-xs">Locked</Badge>
																) : user.failedLoginAttempts > 0 ? (
																	<span className="text-xs text-amber-600">{user.failedLoginAttempts} failed</span>
																) : (
																	<span className="text-xs text-muted-foreground">—</span>
																)}
															</TableCell>
															<TableCell>
																<span className="text-sm text-muted-foreground">
																	{formatDate(user.updatedAt)}
																</span>
															</TableCell>
														</motion.tr>
													))}
												</AnimatePresence>
											</TableBody>
										</Table>
									)}
								</CardContent>
							</Card>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
