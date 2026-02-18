import {
	AIMessage,
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
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
import { buildSystemPrompt } from "../prompts/system-prompt";
import { CheckpointerService } from "../checkpointer/checkpointer.service";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { ThinkingStepCallbackHandler } from "../utils/custom-event-handler";

@Injectable()
export class DeepAgentService {
	private readonly logger = new Logger(DeepAgentService.name);

	constructor(
		private readonly connectorService: ConnectorService,
		private readonly chatsService: ChatsService,
		private readonly conversationMemoryService: ConversationMemoryService,
		private readonly prisma: PrismaService,
		private readonly checkpointerService: CheckpointerService,
	) {}

	private createAgent(
		dependencies: ToolDependencies,
		language?: string,
		checkpointer?: BaseCheckpointSaver,
	) {
		const llm = new ChatOpenAI({
			modelName: "gpt-5.2",
			temperature: 0.4,
			streaming: true,
		});

		const tools = buildTools(dependencies);
		const toolNode = new ToolNode(tools);
		const model = llm.bindTools(tools);
		const systemPrompt = new SystemMessage(buildSystemPrompt(language));

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

		const graphBuilder = new StateGraph(SurfSenseAgentAnnotation)
			.addNode("agent", callModel)
			.addNode("tools", toolNode)
			.addEdge("__start__", "agent")
			.addConditionalEdges("agent", shouldContinue)
			.addEdge("tools", "agent");

		if (checkpointer) {
			return graphBuilder.compile({ checkpointer });
		}

		return graphBuilder.compile();
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

		const dependencies: ToolDependencies = {
			searchSpaceId: params.searchSpaceId,
			userId: params.userId,
			connectorService: this.connectorService,
			prisma: this.prisma,
			defaultConnectors: params.selectedConnectors,
			documentIdsToAddInContext: params.documentIdsToAddInContext,
		};

		const checkpointer = this.checkpointerService.isReady()
			? this.checkpointerService.getCheckpointer()
			: undefined;

		const graph = this.createAgent(dependencies, params.language, checkpointer);
		this.logger.log(
			`Starting deep agent stream for search space ${params.searchSpaceId}`,
		);

		const streamConfig: RunnableConfig = {
			configurable: checkpointer
				? { thread_id: String(currentChatId) }
				: {},
		};

		const inputState = {
			messages: [new HumanMessage(params.userQuery)] as BaseMessage[],
			search_space_id: params.searchSpaceId,
		};

		const stream = await graph.stream(inputState, {
			...streamConfig,
			encoding: "text/event-stream",
			streamMode: ["messages", "custom"],
			callbacks: [new ThinkingStepCallbackHandler()],
		});

		return {
			stream,
			chatId: currentChatId,
			chatWasCreated,
		};
	}
}
