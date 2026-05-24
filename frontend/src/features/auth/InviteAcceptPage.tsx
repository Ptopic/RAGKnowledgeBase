"use client";

import { CheckCircle, Loader2, Mail, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import useAcceptInvitation from "@/api/searchspaces/hooks/useAcceptInvitation";
import useDeclineInvitation from "@/api/searchspaces/hooks/useDeclineInvitation";
import useGetInvitationByToken from "@/api/searchspaces/hooks/useGetInvitationByToken";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const InviteAcceptPage = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [actionTaken, setActionTaken] = useState<"accepted" | "declined" | null>(null);

	const {
		data: invitation,
		isLoading,
		error,
	} = useGetInvitationByToken(token);

	const acceptMutation = useAcceptInvitation({
		onSuccess: () => {
			setActionTaken("accepted");
			toast.success("Invitation accepted! You now have access to this search space.");
			setTimeout(() => router.push("/dashboard"), 2000);
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to accept invitation.");
		},
	});

	const declineMutation = useDeclineInvitation({
		onSuccess: () => {
			setActionTaken("declined");
			toast.success("Invitation declined.");
		},
		onError: (err: Error) => {
			toast.error(err.message || "Failed to decline invitation.");
		},
	});

	const handleAccept = () => {
		if (token) {
			acceptMutation.mutate({ token });
		}
	};

	const handleDecline = () => {
		if (token) {
			declineMutation.mutate({ token });
		}
	};

	// No token in URL
	if (!token) {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<XCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
						<CardTitle className="text-2xl">Invalid Invitation</CardTitle>
						<CardDescription>This invitation link is invalid or missing.</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Loading
	if (isLoading) {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
				<Card className="w-full max-w-md">
					<CardContent className="flex flex-col items-center py-12">
						<Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
						<p className="text-muted-foreground">Loading invitation...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error / expired / not found
	if (error || !invitation) {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<XCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
						<CardTitle className="text-2xl">Invitation Not Found</CardTitle>
						<CardDescription>
							This invitation may have expired, been declined, or does not exist.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Already accepted
	if (invitation.status === "ACCEPTED") {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
						<CardTitle className="text-2xl">Already Accepted</CardTitle>
						<CardDescription>You have already accepted this invitation.</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Already declined or expired
	if (invitation.status === "DECLINED" || invitation.status === "EXPIRED") {
		const statusText = invitation.status === "DECLINED" ? "Declined" : "Expired";
		return (
			<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
						<CardTitle className="text-2xl">Invitation {statusText}</CardTitle>
						<CardDescription>This invitation has been {statusText.toLowerCase()}.</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Post-action states
	if (actionTaken === "accepted") {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
						<CardTitle className="text-2xl">Welcome!</CardTitle>
						<CardDescription>Redirecting to your dashboard...</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (actionTaken === "declined") {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
						<CardTitle className="text-2xl">Invitation Declined</CardTitle>
						<CardDescription>You have declined this invitation.</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	// PENDING invitation - show Accept/Decline
	return (
		<div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 dark:bg-neutral-900 px-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<Mail className="h-12 w-12 mx-auto text-primary mb-2" />
					<CardTitle className="text-2xl">Search Space Invitation</CardTitle>
					<CardDescription>
						{invitation.inviterName || "Someone"} has invited you to join{" "}
						<span className="font-semibold">{invitation.searchSpaceName || "a search space"}</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-3">
						<Button
							onClick={handleAccept}
							disabled={acceptMutation.isPending || declineMutation.isPending}
							className="w-full"
						>
							{acceptMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Accepting...
								</>
							) : (
								"Accept Invitation"
							)}
						</Button>
						<Button
							variant="outline"
							onClick={handleDecline}
							disabled={acceptMutation.isPending || declineMutation.isPending}
							className="w-full"
						>
							{declineMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Declining...
								</>
							) : (
								"Decline"
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default InviteAcceptPage;
