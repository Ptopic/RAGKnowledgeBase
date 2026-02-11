import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const SurfSenseAgentAnnotation = Annotation.Root({
	...MessagesAnnotation.spec,
	search_space_id: Annotation<number>({
		reducer: (_, next) => next,
		default: () => 0,
	}),
});

export type SurfSenseAgentState = typeof SurfSenseAgentAnnotation.State;
