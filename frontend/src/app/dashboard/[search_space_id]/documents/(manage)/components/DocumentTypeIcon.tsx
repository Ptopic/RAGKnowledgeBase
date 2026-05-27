"use client";

import type React from "react";
import { getConnectorIcon } from "@/contracts/enums/connectorIcons";
import { Loader2, AlertCircle } from "lucide-react";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

export function getDocumentTypeIcon(type: string): React.ReactNode {
	return getConnectorIcon(type);
}

export function getDocumentTypeLabel(type: string): string {
	return type
		.split("_")
		.map((word) => word.charAt(0) + word.slice(1).toLowerCase())
		.join(" ");
}

export function DocumentTypeChip({
	type,
	processingStatus,
	className,
}: {
	type: string;
	processingStatus?: "PROCESSING" | "COMPLETED" | "FAILED";
	className?: string;
}) {
	if (processingStatus === "PROCESSING") {
		return (
			<span
				className={
					"inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 " +
					(className ?? "")
				}
			>
				<Loader2 size={12} className="animate-spin text-blue-500" />
				In progress
			</span>
		);
	}

	if (processingStatus === "FAILED") {
		return (
			<span
				className={
					"inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 " +
					(className ?? "")
				}
			>
				<AlertCircle size={12} className="text-red-500" />
				Failed
			</span>
		);
	}

	const icon = getDocumentTypeIcon(type);
	return (
		<span
			className={
				"inline-flex items-center gap-1.5 rounded-full border border-border bg-primary/5 px-2 py-1 text-xs font-medium " +
				(className ?? "")
			}
		>
			<span className="text-primary">{icon}</span>
			{getDocumentTypeLabel(type)}
		</span>
	);
}
