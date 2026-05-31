"use client";

import useGoogleLogin from "@api/auth/hooks/useGoogleLogin";
import useLogin from "@api/auth/hooks/useLogin";
import useSignup from "@api/auth/hooks/useSignup";
import { setAuthToken, setAuthTokens } from "@shared/utils/authClient";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveRedirectPath } from "./AuthPage.utils";

declare global {
	interface Window {
		google?: {
			accounts: {
				oauth2: {
					initTokenClient: (config: {
						client_id: string;
						scope: string;
						redirect_uri?: string;
						callback: (response: { access_token: string }) => void;
					}) => {
						requestAccessToken: () => void;
					};
				};
			};
		};
	}
}

type AuthMode = "signin" | "signup";

const AuthPage = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const redirectPath = resolveRedirectPath(searchParams);
	const [mode, setMode] = useState<AuthMode>("signin");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(searchParams.get("error"));
	const [isGoogleReady, setIsGoogleReady] = useState(false);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [fullName, setFullName] = useState("");

	const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(
		null,
	);

	const clearError = () => setError(null);

	const googleLoginMutation = useGoogleLogin({
		onSuccess: (data) => {
			setAuthToken(data);
			queryClient.invalidateQueries();
			setIsLoading(false);
			router.push(redirectPath);
			router.refresh();
		},
		onError: (err) => {
			setError(err.message || "Failed to sign in with Google");
			setIsLoading(false);
		},
	});

	const loginMutation = useLogin({
		onSuccess: (data) => {
			setAuthTokens(data);
			queryClient.invalidateQueries();
			setIsLoading(false);
			router.push(redirectPath);
			router.refresh();
		},
		onError: (err: Error) => {
			setError(err.message || "Invalid email or password");
			setIsLoading(false);
		},
	});

	const signupMutation = useSignup({
		onSuccess: (data) => {
			setAuthTokens(data);
			queryClient.invalidateQueries();
			setIsLoading(false);
			router.push(redirectPath);
			router.refresh();
		},
		onError: (err: Error) => {
			setError(err.message || "Failed to create account");
			setIsLoading(false);
		},
	});

	useEffect(() => {
		const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

		if (!clientId) {
			setError(
				"Google OAuth client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID",
			);
			return;
		}

		const loadGoogleScript = () => {
			if (window.google?.accounts?.oauth2) {
				initializeGoogleSignIn(clientId);
				return;
			}

			const existingScript = document.querySelector(
				'script[src="https://accounts.google.com/gsi/client"]',
			);
			if (existingScript) {
				setTimeout(() => {
					if (window.google?.accounts?.oauth2) {
						initializeGoogleSignIn(clientId);
					}
				}, 100);
				return;
			}

			const script = document.createElement("script");
			script.src = "https://accounts.google.com/gsi/client";
			script.async = true;
			script.defer = true;
			script.onload = () => initializeGoogleSignIn(clientId);
			script.onerror = () => {
				setError("Failed to load Google Sign-In script");
			};
			document.head.appendChild(script);
		};

		const initializeGoogleSignIn = (clientId: string) => {
			if (!window.google?.accounts?.oauth2) {
				console.warn("Google OAuth2 not ready");
				return;
			}

			try {
				const redirectUri = window.location.origin;

				const tokenClient = window.google.accounts.oauth2.initTokenClient({
					client_id: clientId,
					scope: "openid email profile",
					redirect_uri: redirectUri,
					callback: async (tokenResponse) => {
						if (tokenResponse.access_token) {
							setIsLoading(true);
							setError(null);
							await googleLoginMutation.mutateAsync({
								token: tokenResponse.access_token,
							});
						} else {
							setError("Failed to obtain access token from Google");
							setIsLoading(false);
						}
					},
				});

				tokenClientRef.current = tokenClient;
				setIsGoogleReady(true);
			} catch (err) {
				console.error("Error initializing Google Sign-In:", err);
				setError("Failed to initialize Google Sign-In");
			}
		};

		loadGoogleScript();
	}, [googleLoginMutation]);

	const handleGoogleSignIn = () => {
		if (tokenClientRef.current && !isLoading) {
			setError(null);
			tokenClientRef.current.requestAccessToken();
		}
	};

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		if (mode === "signin") {
			await loginMutation.mutateAsync({ email, password });
		} else {
			if (password.length < 6) {
				setError("Password must be at least 6 characters");
				setIsLoading(false);
				return;
			}
			await signupMutation.mutateAsync({ email, password, fullName });
		}
	};

	const switchMode = (newMode: AuthMode) => {
		setMode(newMode);
		setError(null);
		setPassword("");
	};

	return (
		<div className="flex min-h-[100dvh] items-center justify-center bg-neutral1000 px-4">
			<div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-surface p-8 shadow-lg">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-text">Welcome</h1>
					<p className="mt-2 text-text-secondary">
						Sign in or create an account to continue
					</p>
				</div>

				{error && (
					<div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
						{error}
					</div>
				)}

				<button
					onClick={handleGoogleSignIn}
					disabled={!isGoogleReady || isLoading}
					className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-text transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isLoading &&
					!loginMutation.isPending &&
					!signupMutation.isPending ? (
						<>
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<span>Signing in...</span>
						</>
					) : (
						<>
							<svg
								className="h-5 w-5"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									fill="#4285F4"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									fill="#34A853"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									fill="#FBBC05"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									fill="#EA4335"
								/>
							</svg>
							<span className="font-medium">Continue with Google</span>
						</>
					)}
				</button>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t border-border" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-surface px-2 text-text-secondary">or</span>
					</div>
				</div>

				<Tabs value={mode} onValueChange={(v) => switchMode(v as AuthMode)}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="signin">Sign In</TabsTrigger>
						<TabsTrigger value="signup">Sign Up</TabsTrigger>
					</TabsList>

					<TabsContent value="signin">
						<form onSubmit={handleEmailSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="signin-email">Email</Label>
								<Input
									id="signin-email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										clearError();
									}}
									required
									autoComplete="email"
								/>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="signin-password">Password</Label>
									<Link
										href="/auth/forgot-password"
										className="text-xs text-primary hover:underline"
									>
										Forgot password?
									</Link>
								</div>
								<Input
									id="signin-password"
									type="password"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => {
										setPassword(e.target.value);
										clearError();
									}}
									required
									autoComplete="current-password"
									minLength={6}
								/>
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={isLoading || !email || !password}
							>
								{loginMutation.isPending ? (
									<>
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
										<span>Signing in...</span>
									</>
								) : (
									"Sign In"
								)}
							</Button>
						</form>
					</TabsContent>

					<TabsContent value="signup">
						<form onSubmit={handleEmailSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="signup-name">Full Name</Label>
								<Input
									id="signup-name"
									type="text"
									placeholder="John Doe"
									value={fullName}
									onChange={(e) => {
										setFullName(e.target.value);
										clearError();
									}}
									autoComplete="name"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="signup-email">Email</Label>
								<Input
									id="signup-email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										clearError();
									}}
									required
									autoComplete="email"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="signup-password">Password</Label>
								<Input
									id="signup-password"
									type="password"
									placeholder="Min. 6 characters"
									value={password}
									onChange={(e) => {
										setPassword(e.target.value);
										clearError();
									}}
									required
									autoComplete="new-password"
									minLength={6}
								/>
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={
									isLoading || !email || !password || password.length < 6
								}
							>
								{signupMutation.isPending ? (
									<>
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
										<span>Creating account...</span>
									</>
								) : (
									"Create Account"
								)}
							</Button>
						</form>
					</TabsContent>
				</Tabs>

				<div className="text-center text-xs text-text-secondary">
					<p>
						By signing in, you agree to our Terms of Service and Privacy Policy
					</p>
				</div>
			</div>
		</div>
	);
};

export default AuthPage;
