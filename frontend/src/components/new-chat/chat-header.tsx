"use client";

import { Brain } from "lucide-react";
import { ModelSelector } from "./model-selector";

export function ChatHeader() {
	return (
		<div className="flex items-center justify-between rounded-xl border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="flex items-center gap-2 text-sm font-medium">
				<div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
					<Brain className="h-4 w-4 text-primary" />
				</div>
				<span>Research Chat</span>
			</div>
			<ModelSelector />
		</div>
	);
}
