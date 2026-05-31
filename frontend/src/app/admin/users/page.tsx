"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	AlertCircle,
	Ban,
	CheckCircle,
	Crown,
	Dices,
	Edit3,
	Eye,
	EyeOff,
	Loader2,
	RefreshCw,
	Search,
	Trash2,
	UserPlus,
	Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import useCreateAdminUser from "@/api/admin/hooks/useCreateAdminUser";
import useDeleteAdminUser from "@/api/admin/hooks/useDeleteAdminUser";
import useGetAdminUsers from "@/api/admin/hooks/useGetAdminUsers";
import useToggleAdminUserActive from "@/api/admin/hooks/useToggleAdminUserActive";
import useUpdateAdminUser from "@/api/admin/hooks/useUpdateAdminUser";
import type { AdminUser, UpdateAdminUser } from "@/api/admin/types";
import useGetCurrentUser from "@/api/users/hooks/useGetCurrentUser";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const getInitials = (name: string | null, email: string) => {
	if (name) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}
	return email[0].toUpperCase();
};

const formatDate = (dateStr: string) => {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

const generateRandomPassword = () => {
	const chars =
		"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
	const length = 16;
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => chars[b % chars.length]).join("");
};

const createUserSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email address"),
	fullName: z.string().max(255, "Name too long").optional(),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.optional()
		.or(z.literal("")),
	pagesLimit: z.coerce
		.number()
		.int()
		.min(1, "Must be at least 1")
		.max(100000, "Limit too high"),
	isActive: z.boolean(),
	isSuperuser: z.boolean(),
});

const editUserSchema = z.object({
	fullName: z.string().max(255, "Name too long").optional(),
	pagesLimit: z.coerce
		.number()
		.int()
		.min(1, "Must be at least 1")
		.max(100000, "Limit too high"),
	isActive: z.boolean(),
	isSuperuser: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

export default function AdminUsersPage() {
	const { data: currentUser } = useGetCurrentUser();
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	const { data, isLoading, error, refetch } = useGetAdminUsers({
		skip: 0,
		limit: 100,
		search: debouncedSearch || undefined,
	});

	const createMutation = useCreateAdminUser();
	const updateMutation = useUpdateAdminUser();
	const deleteMutation = useDeleteAdminUser();
	const toggleActiveMutation = useToggleAdminUserActive();

	const [isAddOpen, setIsAddOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
	const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
	const [togglingUser, setTogglingUser] = useState<AdminUser | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const users = data?.users ?? [];
	const total = data?.total ?? 0;

	const activeCount = users.filter((u) => u.isActive).length;
	const adminCount = users.filter((u) => u.isSuperuser).length;

	const handleSearch = useCallback((value: string) => {
		setSearch(value);
		const timer = setTimeout(() => {
			setDebouncedSearch(value);
		}, 300);
		return () => clearTimeout(timer);
	}, []);

	const addForm = useForm<CreateUserFormValues>({
		resolver: zodResolver(createUserSchema),
		defaultValues: {
			email: "",
			fullName: "",
			password: "",
			pagesLimit: 500,
			isActive: true,
			isSuperuser: false,
		},
	});

	const editForm = useForm<EditUserFormValues>({
		resolver: zodResolver(editUserSchema),
		defaultValues: {
			fullName: "",
			pagesLimit: 500,
			isActive: true,
			isSuperuser: false,
		},
	});

	const openEditDialog = (user: AdminUser) => {
		setEditingUser(user);
		editForm.reset({
			fullName: user.fullName ?? "",
			isActive: user.isActive,
			isSuperuser: user.isSuperuser,
			pagesLimit: user.pagesLimit,
		});
	};

	const handleAddSubmit = async (values: CreateUserFormValues) => {
		try {
			await createMutation.mutateAsync({
				email: values.email,
				fullName: values.fullName || undefined,
				password: values.password || undefined,
				pagesLimit: values.pagesLimit,
				isActive: values.isActive,
				isSuperuser: values.isSuperuser,
			});
			toast.success("User created successfully");
			setIsAddOpen(false);
			addForm.reset();
			refetch();
		} catch {
			toast.error("Failed to create user");
		}
	};

	const handleEditSubmit = async (values: EditUserFormValues) => {
		if (!editingUser) return;
		try {
			await updateMutation.mutateAsync({
				id: editingUser.id,
				data: values as UpdateAdminUser,
			});
			toast.success("User updated successfully");
			setEditingUser(null);
			refetch();
		} catch {
			toast.error("Failed to update user");
		}
	};

	const handleDelete = async () => {
		if (!deletingUser) return;
		try {
			await deleteMutation.mutateAsync(deletingUser.id);
			toast.success("User deleted successfully");
			setDeletingUser(null);
			refetch();
		} catch {
			toast.error("Failed to delete user");
		}
	};

	const handleToggleActive = async () => {
		if (!togglingUser) return;
		try {
			await toggleActiveMutation.mutateAsync(togglingUser.id);
			const action = togglingUser.isActive ? "disabled" : "enabled";
			toast.success(`User ${action} successfully`);
			setTogglingUser(null);
			refetch();
		} catch {
			toast.error("Failed to toggle user status");
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container max-w-7xl mx-auto p-6 lg:p-8">
				<div className="space-y-8">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<h1 className="text-2xl font-semibold tracking-tight">Users</h1>
								<p className="text-sm text-muted-foreground">
									Manage user accounts, permissions, and access levels.
								</p>
							</div>
							<Button
								className="flex items-center gap-2"
								onClick={() => setIsAddOpen(true)}
							>
								<UserPlus className="h-4 w-4" />
								Add User
							</Button>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<Card className="border-l-4 border-l-blue-500">
							<CardContent className="p-6">
								<div className="flex items-center justify-between space-x-4">
									<div className="space-y-1">
										<p className="text-3xl font-bold tracking-tight">{total}</p>
										<p className="text-sm font-medium text-muted-foreground">
											Total Users
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
											{activeCount}
										</p>
										<p className="text-sm font-medium text-muted-foreground">
											Active Users
										</p>
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
										<p className="text-3xl font-bold tracking-tight">
											{adminCount}
										</p>
										<p className="text-sm font-medium text-muted-foreground">
											Admins
										</p>
									</div>
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
										<Crown className="h-6 w-6 text-amber-600" />
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
										<Users className="h-5 w-5 text-primary" />
									</div>
									<div>
										<CardTitle className="text-lg font-medium">
											User Management
										</CardTitle>
										<CardDescription>
											{total} user{total !== 1 ? "s" : ""} in the system
										</CardDescription>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Search by email or name..."
											value={search}
											onChange={(e) => handleSearch(e.target.value)}
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
										<span>Loading users...</span>
									</div>
								</div>
							) : users.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-16 text-center">
									<div className="rounded-full bg-muted p-4 mb-6">
										<Users className="h-10 w-10 text-muted-foreground" />
									</div>
									<h3 className="text-xl font-semibold">No Users Found</h3>
									<p className="text-muted-foreground max-w-sm mt-2">
										{debouncedSearch
											? "No users match your search criteria."
											: "No users have been created yet."}
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>User</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Role</TableHead>
											<TableHead>Pages</TableHead>
											<TableHead>Created</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<AnimatePresence>
											{users.map((user) => {
												const isCurrentUser = user.id === currentUser?.id;

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
															<div className="flex items-center gap-3">
																<Avatar className="h-8 w-8">
																	<AvatarImage
																		src={undefined}
																		alt={user.fullName ?? user.email}
																	/>
																	<AvatarFallback className="text-xs">
																		{getInitials(user.fullName, user.email)}
																	</AvatarFallback>
																</Avatar>
																<div className="flex flex-col">
																	<span className="font-medium text-sm">
																		{user.fullName ?? user.email}
																		{isCurrentUser && (
																			<span className="text-muted-foreground ml-1">
																				(you)
																			</span>
																		)}
																	</span>
																	<span className="text-xs text-muted-foreground">
																		{user.email}
																	</span>
																</div>
															</div>
														</TableCell>
														<TableCell>
															<Badge
																className={
																	user.isActive
																		? "bg-green-600 text-white"
																		: "bg-red-600 text-white"
																}
															>
																{user.isActive ? "Active" : "Disabled"}
															</Badge>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																{user.isSuperuser && (
																	<Crown className="h-3 w-3 text-amber-500" />
																)}
																<Badge
																	variant={
																		user.isSuperuser ? "default" : "outline"
																	}
																>
																	{user.isSuperuser ? "Admin" : "User"}
																</Badge>
															</div>
														</TableCell>
														<TableCell>
															<span className="text-sm">
																{user.pagesUsed}/{user.pagesLimit}
															</span>
														</TableCell>
														<TableCell>
															<span className="text-sm text-muted-foreground">
																{formatDate(user.createdAt)}
															</span>
														</TableCell>
														<TableCell className="text-right">
															<div className="flex items-center justify-end gap-1">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => openEditDialog(user)}
																	className="h-8 w-8 p-0"
																>
																	<Edit3 className="h-4 w-4" />
																</Button>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => setTogglingUser(user)}
																	disabled={isCurrentUser}
																	className={`h-8 w-8 p-0 ${user.isActive ? "border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white" : "border-green-500/20 text-green-600 hover:bg-green-500 hover:text-white"}`}
																>
																	{user.isActive ? (
																		<Ban className="h-4 w-4" />
																	) : (
																		<CheckCircle className="h-4 w-4" />
																	)}
																</Button>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => setDeletingUser(user)}
																	disabled={isCurrentUser}
																	className="h-8 w-8 p-0 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
																>
																	<Trash2 className="h-4 w-4" />
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

					<Dialog
						open={isAddOpen}
						onOpenChange={(open) => {
							if (!open) {
								setIsAddOpen(false);
								addForm.reset();
							}
						}}
					>
						<DialogContent className="max-w-lg">
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<UserPlus className="w-5 h-5" />
									Add New User
								</DialogTitle>
								<DialogDescription>
									Create a new user account. Password is optional — users
									without a password can use Google sign-in.
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={addForm.handleSubmit(handleAddSubmit)}
								className="space-y-4 py-4"
							>
								<div className="space-y-2">
									<Label htmlFor="add-email">Email *</Label>
									<Input
										id="add-email"
										type="email"
										{...addForm.register("email")}
										placeholder="user@example.com"
									/>
									{addForm.formState.errors.email && (
										<p className="text-sm text-destructive">
											{addForm.formState.errors.email.message}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="add-name">Full Name</Label>
									<Input
										id="add-name"
										{...addForm.register("fullName")}
										placeholder="John Doe"
									/>
									{addForm.formState.errors.fullName && (
										<p className="text-sm text-destructive">
											{addForm.formState.errors.fullName.message}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="add-password">Password</Label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<Input
												id="add-password"
												type={showPassword ? "text" : "password"}
												{...addForm.register("password")}
												placeholder="Minimum 8 characters"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
												onClick={() => setShowPassword(!showPassword)}
											>
												{showPassword ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="flex items-center gap-1.5 shrink-0"
											onClick={() => {
												const pw = generateRandomPassword();
												addForm.setValue("password", pw);
												setShowPassword(true);
											}}
										>
											<Dices className="h-4 w-4" />
											Generate
										</Button>
									</div>
									{addForm.formState.errors.password && (
										<p className="text-sm text-destructive">
											{addForm.formState.errors.password.message}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="add-pages-limit">Pages Limit</Label>
									<Input
										id="add-pages-limit"
										type="number"
										{...addForm.register("pagesLimit", { valueAsNumber: true })}
									/>
									{addForm.formState.errors.pagesLimit && (
										<p className="text-sm text-destructive">
											{addForm.formState.errors.pagesLimit.message}
										</p>
									)}
								</div>
								<div className="flex items-center justify-between">
									<Label htmlFor="add-active">Active</Label>
									<Switch
										id="add-active"
										checked={addForm.watch("isActive")}
										onCheckedChange={(checked) =>
											addForm.setValue("isActive", checked)
										}
									/>
								</div>
								<div className="flex items-center justify-between">
									<Label htmlFor="add-admin">Admin</Label>
									<Switch
										id="add-admin"
										checked={addForm.watch("isSuperuser")}
										onCheckedChange={(checked) =>
											addForm.setValue("isSuperuser", checked)
										}
									/>
								</div>
							</form>
							<DialogFooter>
								<Button
									variant="outline"
									type="button"
									onClick={() => {
										setIsAddOpen(false);
										addForm.reset();
									}}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									onClick={addForm.handleSubmit(handleAddSubmit)}
									disabled={createMutation.isPending}
								>
									{createMutation.isPending && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									Create User
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					<Dialog
						open={!!editingUser}
						onOpenChange={(open) => {
							if (!open) setEditingUser(null);
						}}
					>
						<DialogContent className="max-w-lg">
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<Edit3 className="w-5 h-5" />
									Edit User
								</DialogTitle>
								<DialogDescription>
									Update account details for {editingUser?.email}
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={editForm.handleSubmit(handleEditSubmit)}
								className="space-y-4 py-4"
							>
								<div className="space-y-2">
									<Label htmlFor="edit-name">Full Name</Label>
									<Input id="edit-name" {...editForm.register("fullName")} />
									{editForm.formState.errors.fullName && (
										<p className="text-sm text-destructive">
											{editForm.formState.errors.fullName.message}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label htmlFor="edit-pages-limit">Pages Limit</Label>
									<Input
										id="edit-pages-limit"
										type="number"
										{...editForm.register("pagesLimit", {
											valueAsNumber: true,
										})}
									/>
									{editForm.formState.errors.pagesLimit && (
										<p className="text-sm text-destructive">
											{editForm.formState.errors.pagesLimit.message}
										</p>
									)}
								</div>
								<div className="flex items-center justify-between">
									<Label htmlFor="edit-active">Active</Label>
									<Switch
										id="edit-active"
										checked={editForm.watch("isActive")}
										onCheckedChange={(checked) =>
											editForm.setValue("isActive", checked)
										}
										disabled={editingUser?.id === currentUser?.id}
									/>
								</div>
								<div className="flex items-center justify-between">
									<Label htmlFor="edit-admin">Admin</Label>
									<Switch
										id="edit-admin"
										checked={editForm.watch("isSuperuser")}
										onCheckedChange={(checked) =>
											editForm.setValue("isSuperuser", checked)
										}
										disabled={editingUser?.id === currentUser?.id}
									/>
								</div>
							</form>
							<DialogFooter>
								<Button
									variant="outline"
									type="button"
									onClick={() => setEditingUser(null)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									onClick={editForm.handleSubmit(handleEditSubmit)}
									disabled={updateMutation.isPending}
								>
									{updateMutation.isPending && (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									)}
									Save Changes
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					<AlertDialog
						open={!!deletingUser}
						onOpenChange={(open) => {
							if (!open) setDeletingUser(null);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete User</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete &quot;{deletingUser?.email}
									&quot;? This action cannot be undone. If the user owns search
									spaces, chats, or connectors, deletion will be blocked and you
									should disable the account instead.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDelete}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>

					<AlertDialog
						open={!!togglingUser}
						onOpenChange={(open) => {
							if (!open) setTogglingUser(null);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{togglingUser?.isActive ? "Disable" : "Enable"} User
								</AlertDialogTitle>
								<AlertDialogDescription>
									{togglingUser?.isActive
										? `Are you sure you want to disable "${togglingUser?.email}"? They will be blocked from accessing the application on their next request.`
										: `Are you sure you want to enable "${togglingUser?.email}"? They will regain access to the application.`}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleToggleActive}
									className={
										togglingUser?.isActive
											? "bg-amber-600 text-white hover:bg-amber-700"
											: "bg-green-600 text-white hover:bg-green-700"
									}
								>
									{togglingUser?.isActive ? "Disable" : "Enable"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}
