"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface Message {
	annotations?: any[];
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

export const ChatFurtherQuestions: React.FC<{
	message: Message;
	onQuestionClick?: (question: string) => void;
}> = ({ message, onQuestionClick }) => {
	const rawAnnotations = getAnnotationData(message, "FURTHER_QUESTIONS");

	// Flatten and filter to get all questions
	const questions: string[] = rawAnnotations
		.flat()
		.filter((q): q is string => typeof q === "string" && q.trim() !== "");

	if (questions.length === 0) {
		return null;
	}

	return (
		<Accordion
			type="single"
			collapsible
			className="w-full border rounded-md bg-card shadow-sm"
		>
			<AccordionItem value="suggested-questions" className="border-0">
				<AccordionTrigger className="px-4 py-3 text-sm font-medium text-foreground transition-colors">
					Further Suggested Questions
				</AccordionTrigger>
				<AccordionContent className="px-4 pb-4 pt-0">
					<div className="space-y-2">
						{questions.map((question) => (
							<Button
								key={question}
								variant="outline"
								size="sm"
								className="w-full justify-start text-left h-auto py-2"
								onClick={() => onQuestionClick?.(question)}
							>
								{question}
							</Button>
						))}
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
};
