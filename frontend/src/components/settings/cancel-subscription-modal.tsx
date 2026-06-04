"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useCancelSubscription from "@/api/subscription/hooks/useCancelSubscription";
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

interface CancelSubscriptionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	periodEnd: string | Date;
}

function formatPeriodEnd(value: string | Date): string {
	const date = typeof value === "string" ? new Date(value) : value;
	return date.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

export default function CancelSubscriptionModal({
	open,
	onOpenChange,
	periodEnd,
}: CancelSubscriptionModalProps) {
	const cancelSubscription = useCancelSubscription();

	const handleConfirm = async () => {
		try {
			const result = await cancelSubscription.mutateAsync();
			toast.success(result.message || "Subscription scheduled for cancellation.");
			onOpenChange(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to cancel subscription.";
			toast.error(message);
		}
	};

	const isPending = cancelSubscription.isPending;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-amber-600" />
						Cancel subscription?
					</AlertDialogTitle>
					<AlertDialogDescription>
						You&apos;ll keep full access to all paid features until{" "}
						<strong>{formatPeriodEnd(periodEnd)}</strong>. After that, your account
						will switch to the Free plan. You can resume your subscription any time before
						the period ends.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Keep subscription</AlertDialogCancel>
					<AlertDialogAction
						onClick={(event) => {
							event.preventDefault();
							handleConfirm();
						}}
						disabled={isPending}
						className="bg-red-600 text-white hover:bg-red-700"
					>
						{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Cancel subscription
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
