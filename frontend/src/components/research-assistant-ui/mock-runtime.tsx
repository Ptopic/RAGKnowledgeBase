"use client";

import type { AppendMessage, ThreadMessageLike } from "@assistant-ui/react";
import {
	AssistantRuntimeProvider,
	CompositeAttachmentAdapter,
	SimpleImageAttachmentAdapter,
	SimpleTextAttachmentAdapter,
	useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useCallback, useState } from "react";

const INITIAL_MESSAGES: ThreadMessageLike[] = [
	{
		role: "user",
		content: [
			{ type: "text", text: "Can you help me understand quantum computing?" },
		],
	},
	{
		role: "assistant",
		content: [
			{
				type: "reasoning" as const,
				text: "The user is asking about quantum computing. I should explain the basic concepts, quantum bits (qubits), superposition, and entanglement. I'll also provide some practical applications and current state of the technology.",
			},
			{
				type: "text" as const,
				text: "Quantum computing is a revolutionary approach to computation that harnesses quantum mechanical phenomena.\n\n**Key Concepts:**\n\n1. **Qubits**: Unlike classical bits (0 or 1), qubits can exist in superposition - both states simultaneously\n\n2. **Superposition**: Allows quantum computers to process multiple possibilities in parallel\n\n3. **Entanglement**: Qubits can be correlated, enabling powerful computational capabilities\n\n**Current Applications:**\n- Drug discovery\n- Cryptography\n- Financial modeling\n- Climate simulation",
			},
			{
				type: "source" as const,
				sourceType: "url",
				id: "source-1",
				url: "https://example.com/quantum-basics",
				title: "Introduction to Quantum Computing",
			},
			{
				type: "source" as const,
				sourceType: "url",
				id: "source-2",
				url: "https://example.com/quantum-applications",
				title: "Quantum Computing Applications",
			},
		],
	},
];

const CANNED_RESPONSES: ThreadMessageLike[] = [
	{
		role: "assistant",
		content: [
			{
				type: "reasoning" as const,
				text: "The user wants more information. I'll provide a detailed explanation with examples.",
			},
			{
				type: "text" as const,
				text: "Great question! Let me elaborate further.\n\nQuantum computers use quantum gates to manipulate qubits. These gates perform operations that exploit quantum properties.\n\n**Example - Quantum Parallelism:**\nA 100-qubit system can represent 2^100 states simultaneously. This exponential scaling is what makes quantum computing so powerful for certain problems. 🚀",
			},
		],
	},
	{
		role: "assistant",
		content: [
			{
				type: "reasoning" as const,
				text: "I should provide a practical example with code or pseudocode to help understanding.",
			},
			{
				type: "text" as const,
				text: "Here's a practical perspective:\n\n```python\n# Classical: Check each item one by one\ndef classical_search(database, target):\n    for item in database:\n        if item == target:\n            return True\n    return False\n\n# Quantum: Grover's algorithm searches faster\n# O(√N) instead of O(N)\n```\n\nQuantum algorithms like Grover's can search unsorted databases quadratically faster than classical algorithms! ✨",
			},
			{
				type: "source" as const,
				sourceType: "url",
				id: "grover-source",
				url: "https://example.com/grovers-algorithm",
				title: "Grover's Algorithm Explained",
			},
		],
	},
	{
		role: "assistant",
		content: [
			{
				type: "text" as const,
				text: "Is there anything specific about quantum computing you'd like to explore further? I can explain:\n\n1. Quantum error correction\n2. Quantum supremacy\n3. Different quantum hardware approaches (superconducting, ion trap, photonic)\n4. Quantum programming languages and frameworks\n\nJust let me know! 😊",
			},
		],
	},
	{
		role: "assistant",
		content: [
			{
				type: "reasoning" as const,
				text: "The user seems interested in deeper topics. I'll provide a comprehensive overview of quantum hardware approaches.",
			},
			{
				type: "text" as const,
				text: "Let me tell you about the main quantum hardware approaches:\n\n**1. Superconducting Qubits**\n- Used by IBM, Google\n- Fast gate operations\n- Requires extreme cooling (near absolute zero)\n\n**2. Ion Trap**\n- Used by IonQ, Honeywell\n- Long coherence times\n- High fidelity operations\n\n**3. Photonic**\n- Used by Xanadu\n- Room temperature operation\n- Naturally suited for networking\n\nEach has trade-offs between speed, coherence, and scalability. 🔬",
			},
			{
				type: "source" as const,
				sourceType: "url",
				id: "hardware-source",
				url: "https://example.com/quantum-hardware",
				title: "Quantum Hardware Comparison",
			},
		],
	},
];

let responseIndex = 0;

function getExtractedText(content: AppendMessage["content"]): string {
	const textPart = content.find((p) => p.type === "text");
	return textPart && "text" in textPart ? textPart.text : "";
}

export function MockRuntimeProvider({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [messages, setMessages] =
		useState<readonly ThreadMessageLike[]>(INITIAL_MESSAGES);
	const [isRunning, setIsRunning] = useState(false);

	const generateResponse = useCallback(
		async (currentMessages: ThreadMessageLike[]) => {
			setIsRunning(true);
			await new Promise((resolve) =>
				setTimeout(resolve, 800 + Math.random() * 400),
			);
			const cannedResponse =
				CANNED_RESPONSES[responseIndex % CANNED_RESPONSES.length];
			responseIndex++;
			const newMessages = [...currentMessages, cannedResponse];
			setMessages(newMessages);
			setIsRunning(false);
			return newMessages;
		},
		[],
	);

	const onNew = useCallback(
		async (message: AppendMessage) => {
			const text = getExtractedText(message.content);
			if (!text) return;

			const userMessage: ThreadMessageLike = {
				role: "user",
				content: message.content.filter(
					(p): p is { type: "text"; text: string } => p.type === "text",
				),
			};

			const currentMessages = [...messages, userMessage];
			setMessages(currentMessages);
			await generateResponse(currentMessages);
		},
		[messages, generateResponse],
	);

	const onEdit = useCallback(
		async (message: AppendMessage) => {
			const text = getExtractedText(message.content);
			if (!text) return;

			const parentId = message.parentId;
			const parentIndex = parentId
				? messages.findIndex((_m, i) => String(i) === parentId)
				: -1;

			const userMessage: ThreadMessageLike = {
				role: "user",
				content: message.content.filter(
					(p): p is { type: "text"; text: string } => p.type === "text",
				),
			};

			const truncatedMessages =
				parentIndex >= 0 ? messages.slice(0, parentIndex) : messages;

			const currentMessages = [...truncatedMessages, userMessage];
			setMessages(currentMessages);
			await generateResponse(currentMessages);
		},
		[messages, generateResponse],
	);

	const onReload = useCallback(
		async (_parentId: string | null) => {
			const reversed = [...messages].reverse();
			const lastUserMessage = reversed.find((m) => m.role === "user");
			const lastUserIndex = lastUserMessage
				? messages.length - 1 - reversed.findIndex((m) => m.role === "user")
				: -1;

			const truncatedMessages =
				lastUserIndex >= 0
					? messages.slice(0, lastUserIndex + 1)
					: [...messages];

			setMessages(truncatedMessages);
			await generateResponse(truncatedMessages);
		},
		[messages, generateResponse],
	);

	const onCancel = useCallback(async () => {
		setIsRunning(false);
	}, []);

	const runtime = useExternalStoreRuntime<ThreadMessageLike>({
		messages,
		setMessages,
		onNew,
		onEdit,
		onReload,
		onCancel,
		convertMessage: (m) => m,
		isRunning,
		adapters: {
			attachments: new CompositeAttachmentAdapter([
				new SimpleImageAttachmentAdapter(),
				new SimpleTextAttachmentAdapter(),
			]),
		},
	});

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			{children}
		</AssistantRuntimeProvider>
	);
}
