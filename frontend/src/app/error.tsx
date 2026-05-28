"use client";

import { useEffect } from "react";

function isChunkLoadError(error: Error): boolean {
	return (
		error.name === "ChunkLoadError" ||
		/loading chunk/i.test(error.message) ||
		/loading CSS chunk/i.test(error.message) ||
		/Loading chunk \d+ failed/i.test(error.message)
	);
}

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[GlobalError]", error);
	}, [error]);

	if (isChunkLoadError(error)) {
		if (typeof window !== "undefined") {
			const hasReloaded = sessionStorage.getItem("chunk-load-reloaded");

			if (!hasReloaded) {
				sessionStorage.setItem("chunk-load-reloaded", "true");
				window.location.reload();
				return;
			}

			sessionStorage.removeItem("chunk-load-reloaded");
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="max-w-md space-y-4 text-center">
				<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
					<svg
						className="size-8 text-destructive"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>

				<h2 className="text-xl font-semibold text-foreground">
					Something went wrong
				</h2>

				{isChunkLoadError(error) ? (
					<p className="text-sm text-muted-foreground">
						The application was updated. Please reload the page to get the latest
						version.
					</p>
				) : (
					<p className="text-sm text-muted-foreground">
						An unexpected error occurred. Please try again.
					</p>
				)}

				<button
					type="button"
					onClick={() => {
						if (isChunkLoadError(error)) {
							window.location.reload();
						} else {
							reset();
						}
					}}
					className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
				>
					{isChunkLoadError(error) ? "Reload Page" : "Try Again"}
				</button>
			</div>
		</div>
	);
}
