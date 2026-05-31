"use client";

import useForgotPassword from "@api/auth/hooks/useForgotPassword";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPasswordPage = () => {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [cooldownSeconds, setCooldownSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const forgotPasswordMutation = useForgotPassword({
		onSuccess: () => {
			setSubmitted(true);
			setCooldownSeconds(60);
			setError(null);
			toast.success(
				"If an account exists, a reset link has been sent to your email. Check your inbox.",
			);
		},
		onError: (err: Error) => {
			setError(err.message || "Something went wrong. Please try again.");
		},
	});

	useEffect(() => {
		if (cooldownSeconds <= 0) return;
		const timer = setInterval(() => {
			setCooldownSeconds((prev) => prev - 1);
		}, 1000);
		return () => clearInterval(timer);
	}, [cooldownSeconds]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await forgotPasswordMutation.mutateAsync({ email });
	};

	return (
		<div className="flex min-h-[100dvh] items-center justify-center bg-neutral1000 px-4">
			<div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-lg">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-text">Reset your password</h1>
					<p className="mt-2 text-text-secondary">
						{submitted
							? `Check ${email} for reset instructions`
							: "Enter your email and we will send you a reset link"}
					</p>
				</div>

				{error && (
					<div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
						{error}
					</div>
				)}

				{submitted ? (
					<div className="space-y-4 text-center">
						<Link
							href="/auth"
							className="inline-block text-sm text-primary hover:underline"
						>
							Back to sign in
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									setError(null);
								}}
								required
								autoComplete="email"
							/>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={
								forgotPasswordMutation.isPending ||
								!email ||
								cooldownSeconds > 0
							}
						>
							{forgotPasswordMutation.isPending || cooldownSeconds > 0 ? (
								<span>
									{cooldownSeconds > 0
										? `Wait ${cooldownSeconds}s`
										: "Sending..."}
								</span>
							) : (
								"Send reset link"
							)}
						</Button>
						<div className="text-center">
							<Link
								href="/auth"
								className="text-sm text-text-secondary hover:text-text"
							>
								Back to sign in
							</Link>
						</div>
					</form>
				)}
			</div>
		</div>
	);
};

export default ForgotPasswordPage;
