"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useResetPassword from "@api/auth/hooks/useResetPassword";

const ResetPasswordPage = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (!token) {
			toast.error(
				"Invalid or missing reset token. Please request a new reset link.",
			);
		}
	}, [token]);

	const resetPasswordMutation = useResetPassword({
		onSuccess: () => {
			setSuccess(true);
			toast.success(
				"Password updated! You can now sign in with your new password.",
			);
			setTimeout(() => {
				router.push("/auth");
			}, 2000);
		},
		onError: (err: Error) => {
			toast.error(
				err.message || "Failed to reset password. Please try again.",
			);
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!token) {
			toast.error("Invalid or missing reset token.");
			return;
		}

		if (newPassword.length < 6) {
			toast.error("Password must be at least 6 characters");
			return;
		}

		if (newPassword !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		await resetPasswordMutation.mutateAsync({ token, newPassword });
	};

	return (
		<div className="flex min-h-[100dvh] items-center justify-center bg-neutral1000 px-4">
			<div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-lg">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-text">
						{success ? "Password updated" : "Set new password"}
					</h1>
					<p className="mt-2 text-text-secondary">
						{success
							? "Heading to sign in..."
							: "Enter your new password below"}
					</p>
				</div>

				{success ? (
					<div className="text-center space-y-4">
						<Button
							onClick={() => router.push("/auth")}
							className="w-full"
						>
							Go to sign in
						</Button>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="new-password">New Password</Label>
							<Input
								id="new-password"
								type="password"
								placeholder="Min. 6 characters"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
								autoComplete="new-password"
								minLength={6}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">
								Confirm Password
							</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder="Repeat your new password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								autoComplete="new-password"
							/>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={
								resetPasswordMutation.isPending ||
								!newPassword ||
								!confirmPassword
							}
						>
							{resetPasswordMutation.isPending ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
									<span>Updating...</span>
								</>
							) : (
								"Reset Password"
							)}
						</Button>
					</form>
				)}
			</div>
		</div>
	);
};

export default ResetPasswordPage;