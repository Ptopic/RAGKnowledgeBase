"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Message {
	annotations?: any[];
}

interface TerminalInfo {
	id: number;
	text: string;
	type: string;
}

function getAnnotationData(message: Message, key: string): any {
	if (!message.annotations || !Array.isArray(message.annotations)) {
		return [];
	}

	const results: any[] = [];

	for (const annotation of message.annotations) {
		if (annotation && typeof annotation === "object") {
			// Handle new format: { type: "KEY", data: ... }
			if (
				"type" in annotation &&
				annotation.type === key &&
				"data" in annotation
			) {
				results.push(annotation.data);
			}
			// Handle legacy format: { KEY: ... }
			else if (key in annotation) {
				return annotation[key];
			}
		}
	}

	return results;
}

export default function TerminalDisplay({
	message,
	open,
}: {
	message: Message;
	open: boolean;
}) {
	const [isCollapsed, setIsCollapsed] = useState(!open);
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (bottomRef.current) {
			bottomRef.current.scrollTo({
				top: bottomRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, []);

	if (!message) {
		return null;
	}

	const rawEvents = getAnnotationData(message, "TERMINAL_INFO");

	// Flatten array if needed (each annotation.data is a single event)
	const events: TerminalInfo[] = Array.isArray(rawEvents)
		? rawEvents
				.flat()
				.filter(
					(e): e is TerminalInfo => e && typeof e === "object" && "text" in e,
				)
		: [];

	if (events.length === 0) {
		return null;
	}

	return (
		<div className="bg-gray-900 w-full rounded-lg border border-gray-700 overflow-hidden font-mono text-sm shadow-lg mb-4">
			<Button
				className="w-full bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
				onClick={() => setIsCollapsed(!isCollapsed)}
				variant="ghost"
				type="button"
			>
				<div className="flex gap-2">
					<div className="w-3 h-3 rounded-full bg-red-500" />
					<div className="w-3 h-3 rounded-full bg-yellow-500" />
					<div className="w-3 h-3 rounded-full bg-green-500" />
				</div>
				<div className="text-gray-400 text-xs ml-2 flex-1">
					Agent Process Terminal ({events.length} events)
				</div>
				<div className="text-gray-400">
					{isCollapsed ? (
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Expand</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					) : (
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Collapse</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 15l7-7 7 7"
							/>
						</svg>
					)}
				</div>
			</Button>

			<div
				className={`overflow-hidden bg-gray-900 transition-[max-height,opacity] duration-300 ease-in-out ${
					isCollapsed ? "max-h-0 opacity-0" : "max-h-64 opacity-100"
				}`}
				style={{ maxHeight: isCollapsed ? "0px" : "16rem" }}
				aria-hidden={isCollapsed}
			>
				<div ref={bottomRef} className="h-64 overflow-y-auto p-4 space-y-1">
					{events.map((event, index) => (
						<div key={`${event.id}-${index}`} className="text-green-400">
							<span className="text-blue-400">$</span>
							<span className="text-yellow-400 ml-2">[{event.type || ""}]</span>
							<span className="text-gray-300 ml-4 mt-1 pl-2 border-l-2 border-gray-600">
								{event.text || ""}...
							</span>
						</div>
					))}
					{events.length === 0 && (
						<div className="text-gray-500 italic">
							No agent events to display...
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
