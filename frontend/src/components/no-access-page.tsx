"use client";

import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function NoAccessPage() {
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
								No Access
							</CardTitle>
						<CardDescription>
							You don&apos;t have access to this search space
						</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-4">
					<p className="text-sm text-muted-foreground">
						You may not have been invited to this search space, or your
						access may have been revoked. Contact the space owner if you
						believe this is a mistake.
					</p>
				</CardContent>
				<CardFooter className="border-t pt-4">
					<Link href="/dashboard">
						<Button className="flex items-center gap-2">
							<ArrowLeft className="h-4 w-4" />
							Go to dashboard
						</Button>
					</Link>
				</CardFooter>
			</Card>
		</div>
	);
}
