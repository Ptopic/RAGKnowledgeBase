"use client";

import useGoogleLogin from "@api/auth/hooks/useGoogleLogin";
import { setAuthToken } from "@shared/utils/authClient";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loginWithGoogle } from "@/api/auth/requests";

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

const AuthPage = () => {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isGoogleReady, setIsGoogleReady] = useState(false);
	const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(
		null,
	);

	const googleLoginMutation = useGoogleLogin({
		onSuccess: (data) => {
			setAuthToken(data);
			setIsLoading(false);
			router.push("/dashboard");
			router.refresh();
		},
		onError: (err) => {
			setError(err.message || "Failed to sign in with Google");
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
							try {
								await googleLoginMutation.mutateAsync({
									token: tokenResponse.access_token,
								});
							} catch (err) {
								console.error("Error during Google login:", err);
							}
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
			tokenClientRef.current.requestAccessToken();
		}
	};

	return (
		<div className="flex min-h-[100dvh] items-center justify-center bg-neutral1000 px-4">
			<div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-surface p-8 shadow-lg">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-text">Welcome</h1>
					<p className="mt-2 text-text-secondary">
						Sign in to continue to your account
					</p>
				</div>

				{error && (
					<div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
						{error}
					</div>
				)}

				<div className="space-y-4">
					<button
						onClick={handleGoogleSignIn}
						disabled={!isGoogleReady || isLoading}
						className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-text transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLoading || googleLoginMutation.isPending ? (
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
								<span className="font-medium">Sign in with Google</span>
							</>
						)}
					</button>
				</div>

				<div className="text-center text-sm text-text-secondary">
					<p>
						By signing in, you agree to our Terms of Service and Privacy Policy
					</p>
				</div>
			</div>
		</div>
	);
};

export default AuthPage;
