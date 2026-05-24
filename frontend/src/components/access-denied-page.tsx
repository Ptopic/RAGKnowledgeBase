"use client";

import { ArrowLeft, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function AccessDeniedPage() {
	const router = useRouter();

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-background">
			<Card className="w-[420px] bg-background/60 backdrop-blur-sm border-destructive/20">
				<CardHeader className="pb-2">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
							<ShieldX className="h-6 w-6 text-destructive" />
						</div>
						<div>
							<CardTitle className="text-xl font-medium">
								Access Denied
							</CardTitle>
							<CardDescription>
								You don&apos;t have permission to perform this action
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-4">
					<p className="text-sm text-muted-foreground">
						You don&apos;t have access to this page. Contact your
						space owner to request access.
					</p>
				</CardContent>
				<CardFooter className="border-t pt-4">
					<Button
						className="flex items-center gap-2"
						onClick={() => router.back()}
					>
						<ArrowLeft className="h-4 w-4" />
						Go back
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
