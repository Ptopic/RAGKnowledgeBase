import {
	AIMessage,
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { ChatType } from "@prisma/client";
import { ChatsService } from "src/chats/chats.service";
import { PrismaService } from "src/prisma/prisma.service";
import { buildTools } from "../tools/registry";
import type {
	DeepAgentStreamResult,
	StreamDeepAgentParams,
	ToolDependencies,
} from "../types/agent-types";
import { SurfSenseAgentAnnotation, type SurfSenseAgentState } from "../state/agent-state";
import { ConnectorService } from "./connector.service";
import { ConversationMemoryService } from "./conversation-memory.service";

@Injectable()
export class DeepAgentService {
	private readonly logger = new Logger(DeepAgentService.name);

	constructor(
		private readonly connectorService: ConnectorService,
		private readonly chatsService: ChatsService,
		private readonly conversationMemoryService: ConversationMemoryService,
		private readonly prisma: PrismaService,
	) {}

	private buildSystemPrompt(language?: string): string {
		const today = new Date().toISOString().split("T")[0];
		const languageInstruction = language
			? `\n\nIMPORTANT: Respond in ${language}.`
			: "";

		return `
<system_instruction>
You are SurfSense, a reasoning and acting AI agent designed to answer user questions using the user's personal knowledge base.
Today's date (UTC): ${today}
</system_instruction>

<tools>
You have access to the following tools:

1. search_knowledge_base: Search the user's personal knowledge base for relevant information.
   - ALWAYS use this tool before giving factual answers that depend on user data.
   - When connectors_to_search is omitted, the search runs broadly.

2. link_preview: Fetch metadata for a URL to display a rich preview card.
   - Use this whenever the user shares a URL.

3. display_image: Display an image in the chat with metadata.
   - Use only when you have a valid public HTTP/HTTPS image URL.
</tools>

<citation_instructions>
CRITICAL CITATION REQUIREMENTS:
1. For every factual statement derived from documents, include [citation:chunk_id].
2. Use the exact id from <chunk id='...'>.
3. Never invent chunk IDs.
4. Never format citations as links.
5. Multiple supporting chunks should be: [citation:id1], [citation:id2].
6. If no evidence is found, say you could not find it and suggest refining the query.
</citation_instructions>
${languageInstruction}`;
	}

	private createAgent(dependencies: ToolDependencies, language?: string) {
		const llm = new ChatOpenAI({
			modelName: "gpt-5.2",
			temperature: 0.4,
			streaming: true,
		});

		const tools = buildTools(dependencies);
		const toolNode = new ToolNode(tools);
		const model = llm.bindTools(tools);
		const systemPrompt = new SystemMessage(this.buildSystemPrompt(language));

		const callModel = async (state: SurfSenseAgentState) => {
			const response = await model.invoke([systemPrompt, ...state.messages]);
			return { messages: [response] };
		};

		const shouldContinue = (state: SurfSenseAgentState) => {
			const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
			if (!lastMessage?.tool_calls || lastMessage.tool_calls.length === 0) {
				return "__end__";
			}
			return "tools";
		};

		return new StateGraph(SurfSenseAgentAnnotation)
			.addNode("agent", callModel)
			.addNode("tools", toolNode)
			.addEdge("__start__", "agent")
			.addConditionalEdges("agent", shouldContinue)
			.addEdge("tools", "agent")
			.compile();
	}

	private toBaseMessages(
		recentMessages: Array<{ role: string; content: string }>,
		userQuery: string,
	): BaseMessage[] {
		const messages: BaseMessage[] = [];
		for (const msg of recentMessages) {
			if (msg.role === "user") {
				messages.push(new HumanMessage(msg.content));
			} else if (msg.role === "assistant") {
				messages.push(new AIMessage(msg.content));
			}
		}
		messages.push(new HumanMessage(userQuery));
		return messages;
	}

	async streamDeepAgent(
		params: StreamDeepAgentParams,
	): Promise<DeepAgentStreamResult> {
		let currentChatId = params.chatId;
		let chatWasCreated = false;

		if (!currentChatId) {
			const chatTitleSummary = params.userQuery.substring(0, 50);
			const newChat = await this.chatsService.create(
				{
					type: ChatType.QNA,
					title: chatTitleSummary,
					initial_connectors: params.selectedConnectors,
					messages: [],
					search_space_id: params.searchSpaceId,
				},
				params.userId,
			);
			currentChatId = newChat.id;
			chatWasCreated = true;
		}

		const recentMessages = currentChatId
			? await this.conversationMemoryService.getRecentMessages(
					currentChatId,
					params.userId,
					10,
				)
			: [];

		const graphMessages = this.toBaseMessages(recentMessages, params.userQuery);

		const dependencies: ToolDependencies = {
			searchSpaceId: params.searchSpaceId,
			userId: params.userId,
			connectorService: this.connectorService,
			prisma: this.prisma,
			defaultConnectors: params.selectedConnectors,
			documentIdsToAddInContext: params.documentIdsToAddInContext,
		};

		const graph = this.createAgent(dependencies, params.language);
		this.logger.log(
			`Starting deep agent stream for search space ${params.searchSpaceId}`,
		);

		const stream = await graph.stream(
			{
				messages: graphMessages,
				search_space_id: params.searchSpaceId,
			},
			{
				streamMode: ["messages"],
			},
		);

		return {
			stream,
			chatId: currentChatId,
			chatWasCreated,
		};
	}
}
