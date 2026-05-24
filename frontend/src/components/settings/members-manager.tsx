"use client";

import {
	AlertCircle,
	Clock,
	Crown,
	Loader2,
	LogOut,
	Mail,
	RefreshCw,
	Trash2,
	Users,
	XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import useCancelInvitation from "@/api/searchspaces/hooks/useCancelInvitation";
import useCreateInvitation from "@/api/searchspaces/hooks/useCreateInvitation";
import useGetMembers from "@/api/searchspaces/hooks/useGetMembers";
import useGetPendingInvitations from "@/api/searchspaces/hooks/useGetPendingInvitations";
import useGetSearchSpace from "@/api/searchspaces/hooks/useGetSearchSpace";
import useLeaveSearchSpace from "@/api/searchspaces/hooks/useLeaveSearchSpace";
import useRemoveMember from "@/api/searchspaces/hooks/useRemoveMember";
import useUpdateMemberRole from "@/api/searchspaces/hooks/useUpdateMemberRole";
import type { MemberRole } from "@/api/searchspaces/types";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const roleBadgeVariant = (role: MemberRole) => {
	switch (role) {
		case "OWNER":
			return "default" as const;
		case "EDITOR":
			return "secondary" as const;
		case "VIEWER":
			return "outline" as const;
	}
};

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

const formatRelativeTime = (dateStr: string) => {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	if (diffMs < 0) return "just now";
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);
	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	return `${diffDays}d ago`;
};

interface MembersManagerProps {
	searchSpaceId: number;
}

export function MembersManager({ searchSpaceId }: MembersManagerProps) {
	const { data: members = [], isLoading: loadingMembers, error: membersError, refetch: refetchMembers } = useGetMembers(searchSpaceId);
	const { data: searchSpace, isLoading: loadingSpace } = useGetSearchSpace(searchSpaceId);
	const { data: currentUser } = useGetCurrentUser();

	const createInvitation = useCreateInvitation();
	const updateRoleMutation = useUpdateMemberRole();
	const removeMutation = useRemoveMember();
	const leaveMutation = useLeaveSearchSpace();
	const isOwner = searchSpace?.is_owner ?? false;
	const { data: pendingInvites = [], isLoading: loadingPending } = useGetPendingInvitations(searchSpaceId, isOwner);
	const cancelInvitationMutation = useCancelInvitation();

	const [inviteEmail, setInviteEmail] = useState("");
	const [removingMember, setRemovingMember] = useState<{ id: string; email: string } | null>(null);
	const [leavingSpace, setLeavingSpace] = useState(false);

	const currentUserId = currentUser?.id;

	const handleInvite = () => {
		if (!inviteEmail.trim()) return;

		createInvitation.mutate(
			{ searchSpaceId, inviteeEmail: inviteEmail.trim() },
			{
				onSuccess: () => {
					setInviteEmail("");
				},
			},
		);
	};

	const handleRoleChange = (memberId: string, newRole: MemberRole) => {
		updateRoleMutation.mutate({
			searchSpaceId,
			memberId,
			data: { role: newRole },
		});
	};

	const handleRemoveMember = () => {
		if (!removingMember) return;
		removeMutation.mutate(
			{ searchSpaceId, memberId: removingMember.id },
			{
				onSettled: () => {
					setRemovingMember(null);
				},
			},
		);
	};

	const handleLeaveSpace = () => {
		leaveMutation.mutate(searchSpaceId, {
			onSettled: () => {
				setLeavingSpace(false);
			},
		});
	};

	const isLoading = loadingMembers || loadingSpace;

	return (
		<div className="space-y-6">
			<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
				<div className="space-y-1">
					<div className="flex items-center space-x-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
							<Users className="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<h2 className="text-2xl font-bold tracking-tight">Members</h2>
							<p className="text-muted-foreground">
								Manage who has access to this search space.
							</p>
						</div>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetchMembers()}
						disabled={isLoading}
						className="flex items-center gap-2"
					>
						<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
				</div>
			</div>

			{membersError && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{membersError.message}</AlertDescription>
				</Alert>
			)}

			{isLoading && (
				<Card>
					<CardContent className="flex items-center justify-center py-12">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Loader2 className="w-5 h-5 animate-spin" />
							<span>Loading members...</span>
						</div>
					</CardContent>
				</Card>
			)}

			{!isLoading && isOwner && (
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-6">
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Mail className="h-5 w-5 text-blue-600" />
								<h3 className="text-lg font-semibold tracking-tight">Invite by Email</h3>
							</div>
							<p className="text-sm text-muted-foreground">
								Send an invitation email. The recipient must accept before gaining access.
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Input
									type="email"
									placeholder="Enter email address"
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									className="flex-1"
									onKeyDown={(e) => {
										if (e.key === "Enter") handleInvite();
									}}
								/>
								<Button
									onClick={handleInvite}
									disabled={!inviteEmail.trim() || createInvitation.isPending}
									className="flex items-center gap-2"
								>
									{createInvitation.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Mail className="h-4 w-4" />
									)}
									Send Invite
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{!isLoading && isOwner && (pendingInvites.length > 0 || loadingPending) && (
				<Card className="border-l-4 border-l-amber-500">
					<CardContent className="p-6">
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<Clock className="h-5 w-5 text-amber-600" />
								<h3 className="text-lg font-semibold tracking-tight">Pending Invites</h3>
								{pendingInvites.length > 0 && (
									<Badge variant="secondary" className="ml-2">
										{pendingInvites.length}
									</Badge>
								)}
							</div>
							{loadingPending ? (
								<div className="flex items-center gap-2 text-muted-foreground py-4">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Loading pending invites...</span>
								</div>
							) : pendingInvites.length === 0 ? (
								<p className="text-sm text-muted-foreground">No pending invitations.</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Email</TableHead>
											<TableHead>Sent</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<AnimatePresence>
											{pendingInvites.map((invite) => (
												<motion.tr
													key={invite.id}
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -10 }}
													transition={{ duration: 0.2 }}
													className="hover:bg-muted/50 border-b transition-colors"
												>
													<TableCell>
														<span className="font-medium text-sm">{invite.inviteeEmail}</span>
													</TableCell>
													<TableCell>
														<span className="text-sm text-muted-foreground">{formatRelativeTime(invite.createdAt)}</span>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex items-center justify-end gap-2">
															<Button
																variant="outline"
																size="sm"
																onClick={() => cancelInvitationMutation.mutate({ searchSpaceId, invitationId: invite.id })}
																disabled={cancelInvitationMutation.isPending}
																className="h-8 flex items-center gap-1 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
															>
																<XCircle className="h-4 w-4" />
																Cancel
															</Button>
														</div>
													</TableCell>
												</motion.tr>
											))}
										</AnimatePresence>
									</TableBody>
								</Table>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{!isLoading && (
				<div className="space-y-4">
					<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
						<div>
							<h3 className="text-xl font-semibold tracking-tight">Current Members</h3>
							<p className="text-sm text-muted-foreground">
								{members.length} member{members.length !== 1 ? "s" : ""} in this search space
							</p>
						</div>
					</div>

					{members.length === 0 ? (
						<Card className="border-dashed border-2 border-muted-foreground/25">
							<CardContent className="flex flex-col items-center justify-center py-16 text-center">
								<div className="rounded-full bg-muted p-4 mb-6">
									<Users className="h-10 w-10 text-muted-foreground" />
								</div>
								<div className="space-y-2 mb-6">
									<h3 className="text-xl font-semibold">No Members Yet</h3>
									<p className="text-muted-foreground max-w-sm">
										Invite members to collaborate on this search space.
									</p>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Member</TableHead>
										<TableHead>Role</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									<AnimatePresence>
										{members.map((member) => {
											const isCurrentUser = member.user_id === currentUserId;
											const isOwnerRow = member.role === "OWNER";

											return (
												<motion.tr
													key={member.id}
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -10 }}
													transition={{ duration: 0.2 }}
													className="hover:bg-muted/50 border-b transition-colors"
												>
													<TableCell>
														<div className="flex items-center gap-3">
															<Avatar className="h-8 w-8">
																<AvatarImage src={member.picture ?? undefined} alt={member.full_name ?? member.email} />
																<AvatarFallback className="text-xs">
																	{getInitials(member.full_name, member.email)}
																</AvatarFallback>
															</Avatar>
															<div className="flex flex-col">
																<span className="font-medium text-sm">
																	{member.full_name ?? member.email}
																	{isCurrentUser && (
																		<span className="text-muted-foreground ml-1">(you)</span>
																	)}
																</span>
																{member.full_name && (
																	<span className="text-xs text-muted-foreground">{member.email}</span>
																)}
															</div>
														</div>
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															<Badge variant={roleBadgeVariant(member.role)}>
																{isOwnerRow && <Crown className="h-3 w-3 mr-1" />}
																{member.role}
															</Badge>
														</div>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex items-center justify-end gap-2">
															{isOwner && !isOwnerRow && !isCurrentUser && (
																<>
																	<Select
																		value={member.role}
																		onValueChange={(value) => handleRoleChange(member.id, value as MemberRole)}
																		disabled={updateRoleMutation.isPending}
																	>
																		<SelectTrigger className="w-[120px] h-8">
																			<SelectValue />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value="EDITOR">Editor</SelectItem>
																			<SelectItem value="VIEWER">Viewer</SelectItem>
																		</SelectContent>
																	</Select>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => setRemovingMember({ id: member.id, email: member.email })}
																		className="h-8 w-8 p-0 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</>
															)}
															{isCurrentUser && !isOwner && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => setLeavingSpace(true)}
																	className="h-8 flex items-center gap-1 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
																>
																	<LogOut className="h-4 w-4" />
																	Leave
																</Button>
															)}
														</div>
													</TableCell>
												</motion.tr>
											);
										})}
									</AnimatePresence>
								</TableBody>
							</Table>
						</Card>
					)}
				</div>
			)}

			<AlertDialog
				open={!!removingMember}
				onOpenChange={(open) => {
					if (!open) setRemovingMember(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Member</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove {removingMember?.email} from this search space? They will lose access to all content.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveMember}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Remove
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={leavingSpace}
				onOpenChange={(open) => {
					if (!open) setLeavingSpace(false);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave Search Space</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to leave this search space? You will lose access to all content.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleLeaveSpace}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Leave
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
