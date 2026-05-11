"use client";

import { useThreadRuntime } from "@assistant-ui/react";
import { CheckIcon } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type QuestionItem = {
	text: string;
	options: string[];
	multiple?: boolean;
};

export type QuestionPart = {
	type: "question";
	text?: string;
	options?: string[];
	questions?: QuestionItem[];
	answer?: string;
};

export type QuestionContentProps = {
	part: QuestionPart;
};

function buildQuestions(part: QuestionPart): QuestionItem[] {
	if (Array.isArray(part.questions) && part.questions.length > 0) {
		return part.questions.filter(
			(question) =>
				typeof question.text === "string" &&
				question.text.trim().length > 0 &&
				Array.isArray(question.options) &&
				question.options.length > 0,
		);
	}

	if (typeof part.text === "string" && Array.isArray(part.options)) {
		return [
			{
				multiple: false,
				options: part.options,
				text: part.text,
			},
		];
	}

	return [];
}

export const QuestionContent: FC<QuestionContentProps> = ({ part }) => {
	const threadRuntime = useThreadRuntime();
	const questions = useMemo(() => buildQuestions(part), [part]);
	const [singleSelections, setSingleSelections] = useState<
		Record<number, string>
	>({});
	const [multiSelections, setMultiSelections] = useState<
		Record<number, Record<string, boolean>>
	>({});
	const [customValues, setCustomValues] = useState<Record<number, string>>({});

	if (part.answer) {
		const normalizedAnswer = part.answer
			.replace(/^\[Answer:\s*/i, "")
			.replace(/\]$/, "")
			.trim();
		const answerLines = normalizedAnswer
			.split(/,\s+(?=[^,]+:\s)/g)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		return (
			<div className="my-3 rounded-2xl border border-border/70 bg-card px-5 py-4 text-sm leading-relaxed text-foreground shadow-xs">
				<p className="mb-2 text-base font-semibold text-foreground">Answered</p>
				<div className="space-y-1">
					{answerLines.map((line) => (
						<p
							key={line}
							className="flex items-start gap-2 text-sm text-muted-foreground"
						>
							<CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
							<span>{line}</span>
						</p>
					))}
				</div>
			</div>
		);
	}

	if (questions.length === 0) return null;

	const isQuestionAnswered = (
		question: QuestionItem,
		questionIndex: number,
	) => {
		if (question.multiple) {
			const selected = multiSelections[questionIndex] ?? {};
			const hasSelected = Object.values(selected).some(Boolean);
			if (!hasSelected) return false;

			const hasOther = Boolean(selected["Other (type your own)"]);
			if (!hasOther) return true;

			const custom = (customValues[questionIndex] ?? "").trim();
			return custom.length > 0;
		}

		const selectedOption = singleSelections[questionIndex];
		if (!selectedOption) return false;
		if (selectedOption !== "Other (type your own)") return true;

		const custom = (customValues[questionIndex] ?? "").trim();
		return custom.length > 0;
	};

	const canSubmit = questions.every((question, index) =>
		isQuestionAnswered(question, index),
	);

	const handleSubmit = () => {
		if (!canSubmit) return;

		const parts = questions.map((question, questionIndex) => {
			if (question.multiple) {
				const selected = multiSelections[questionIndex] ?? {};
				const pickedOptions = Object.entries(selected)
					.filter(([, isSelected]) => Boolean(isSelected))
					.map(([option]) => option);
				const custom = (customValues[questionIndex] ?? "").trim();
				const normalizedOptions = pickedOptions.map((option) => {
					if (option !== "Other (type your own)") return option;
					return custom;
				});
				return `${question.text}: ${normalizedOptions.join(", ")}`;
			}

			const selected = singleSelections[questionIndex] ?? "";
			const custom = (customValues[questionIndex] ?? "").trim();
			const answer = selected === "Other (type your own)" ? custom : selected;
			return `${question.text}: ${answer}`;
		});

		threadRuntime.append(`[Answer: ${parts.join(", ")}]`);
	};

	return (
		<div className="my-3 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
			<div className="space-y-5 px-4 py-4 md:px-5">
				{questions.map((question, questionIndex) => {
					const selectedSingle = singleSelections[questionIndex];
					const selectedMulti = multiSelections[questionIndex] ?? {};
					const custom = customValues[questionIndex] ?? "";
					const isOtherSelected = question.multiple
						? selectedMulti["Other (type your own)"] === true
						: selectedSingle === "Other (type your own)";

					return (
						<div
							key={`${question.text}-${question.options.join("|")}`}
							className="space-y-2.5"
						>
							<p className="sr-only text-[30px] font-medium text-foreground">
								{question.text}
							</p>
							<p className="text-base font-semibold leading-6 text-foreground">
								{question.text}
							</p>

							<div className="space-y-2">
								{question.options.map((option) => {
									const isSelected = question.multiple
										? Boolean(selectedMulti[option])
										: selectedSingle === option;

									return (
										<button
											key={option}
											type="button"
											onClick={() => {
												if (question.multiple) {
													setMultiSelections((prev) => ({
														...prev,
														[questionIndex]: {
															...(prev[questionIndex] ?? {}),
															[option]: prev[questionIndex]?.[option] !== true,
														},
													}));
													return;
												}

												setSingleSelections((prev) => ({
													...prev,
													[questionIndex]: option,
												}));
											}}
											className={cn(
												"flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
												isSelected
													? "border-primary/50 bg-primary/10"
													: "border-border/80 bg-background hover:bg-muted/50",
											)}
										>
											<span
												className={cn(
													"flex size-5 items-center justify-center rounded-full border",
													isSelected
														? "border-primary bg-primary text-primary-foreground"
														: "border-muted-foreground/30",
												)}
											>
												{isSelected ? <CheckIcon className="size-3" /> : null}
											</span>
											<span className="text-[15px] text-foreground">
												{option}
											</span>
										</button>
									);
								})}

								{isOtherSelected ? (
									<input
										type="text"
										value={custom}
										onChange={(event) =>
											setCustomValues((prev) => ({
												...prev,
												[questionIndex]: event.target.value,
											}))
										}
										placeholder="Click to type a custom answer"
										className="w-full rounded-lg border border-primary/40 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
									/>
								) : null}
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex justify-end border-t border-border/70 px-4 py-3 md:px-5">
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!canSubmit}
					className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-default disabled:opacity-50"
				>
					Submit
				</button>
			</div>
		</div>
	);
};

QuestionContent.displayName = "QuestionContent";
