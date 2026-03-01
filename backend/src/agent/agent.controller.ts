import {
	BadRequestException,
	Body,
	Controller,
	Logger,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from "@nestjs/common";
import { Response as ExpressResponse } from "express";
import { JwtAuthGuard } from "src/auth/guards/jwt.guard";
import { AgentChatRequestDto, SaveMessagesDto } from "src/chats/dtos/chat.dto";
import { AgentService } from "./agent.service";
import { ChatActionsService } from "./services/chat-actions.service";
import { DeepAgentService } from "./services/deep-agent.service";
import { LLMService } from "./services/llm.service";
import {
	getInitialThinkingStep,
	resetThinkingStepCounter,
} from "./utils/thinking-steps";

@Controller("agent")
export class AgentController {
	private readonly logger = new Logger(AgentController.name);

	constructor(
		private readonly agentService: AgentService,
		private readonly deepAgentService: DeepAgentService,
		private readonly chatActionsService: ChatActionsService,
		private readonly llmService: LLMService,
	) {}

	@Post("chatWithDeepAgent")
	@UseGuards(JwtAuthGuard)
	async chatWithDeepAgent(
		@Body() request: AgentChatRequestDto,
		@Req() req: any,
		@Res() res: ExpressResponse,
	) {
		try {
			const messages = request.messages;

			if (!messages || messages.length === 0) {
				throw new BadRequestException("Messages array is required");
			}

			if (messages[messages.length - 1].role !== "user") {
				throw new BadRequestException("Last message must be a user message");
			}

			const userQuery = messages[messages.length - 1].content;
			const requestData = request.data || {};
			const searchSpaceId = Number(requestData.search_space_id);

			if (!searchSpaceId) {
				throw new BadRequestException("search_space_id is required");
			}

			const selectedConnectors = requestData.selected_connectors || [];
			const documentIdsToAddInContext = (
				requestData.document_ids_to_add_in_context || []
			).map(Number);
			const configuredLanguage = await this.llmService.getUserFastLLMLanguage(
				req.user.id,
				searchSpaceId,
			);
			const language = configuredLanguage || requestData.language || "English";
			const chatId = request.chat_id;

			const { stream, chatId: createdChatId, chatWasCreated } =
				await this.deepAgentService.streamDeepAgent({
					userQuery,
					userId: req.user.id,
					searchSpaceId,
					selectedConnectors,
					documentIdsToAddInContext,
					language,
					chatId,
				});

			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");

			if (chatWasCreated && createdChatId) {
				res.setHeader("X-Chat-Id", createdChatId.toString());
			}

			resetThinkingStepCounter();

			const initialStep = getInitialThinkingStep(userQuery);
			res.write("event: custom\n");
			res.write(`data: ${JSON.stringify({ type: "thinking", ...initialStep })}\n\n`);

			try {
				for await (const chunk of stream) {
					res.write(chunk);
				}
				res.end();
			} catch (error) {
				this.logger.error(`Streaming error: ${error.message}`, error.stack);
				res.write("event: error\n");
				res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
				res.end();
			}
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			this.logger.error(`Chat processing error: ${error.message}`, error.stack);
			throw new BadRequestException(`Failed to process chat: ${error.message}`);
		}
	}

	@Post("chat")
	@UseGuards(JwtAuthGuard)
	async handleChatData(
		@Body() request: AgentChatRequestDto,
		@Req() req: any,
		@Res() res: ExpressResponse,
	) {
		try {
			const messages = request.messages;

			if (!messages || messages.length === 0) {
				throw new BadRequestException("Messages array is required");
			}

			if (messages[messages.length - 1].role !== "user") {
				throw new BadRequestException("Last message must be a user message");
			}

			const userQuery = messages[messages.length - 1].content;
			const requestData = request.data || {};

			const searchSpaceId = Number(requestData.search_space_id);
			if (!searchSpaceId) {
				throw new BadRequestException("search_space_id is required");
			}

			const researchMode = requestData.research_mode || "QNA";
			const selectedConnectors = requestData.selected_connectors || [];
			const documentIdsToAddInContext = (
				requestData.document_ids_to_add_in_context || []
			).map(Number);
			const searchMode = requestData.search_mode || "CHUNKS";
			const configuredLanguage = await this.llmService.getUserFastLLMLanguage(
				req.user.id,
				searchSpaceId,
			);
			const language = configuredLanguage || requestData.language || "English";
			const chatId = request.chat_id;

			const {
				stream,
				chatId: createdChatId,
				chatWasCreated,
			} = await this.agentService.streamConnectorSearchResults({
				userQuery,
				userId: req.user.id,
				searchSpaceId,
				researchMode,
				selectedConnectors,
				searchModeStr: searchMode,
				documentIdsToAddInContext,
				language,
				chatId,
			});

			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");

			if (chatWasCreated && createdChatId) {
				res.setHeader("X-Chat-Id", createdChatId.toString());
			}

			try {
				for await (const chunk of stream) {
					let eventType = "data";
					let dataToSend = chunk;

					if (chunk && typeof chunk === "object") {
						if ("event" in chunk && "data" in chunk) {
							eventType = chunk.event;
							dataToSend = chunk.data;
						} else if (
							Array.isArray(chunk) &&
							chunk.length === 2 &&
							chunk[0] === "messages"
						) {
							eventType = "messages";
							dataToSend = chunk[1];
						} else if ("messages" in chunk) {
							eventType = "messages";
							dataToSend = chunk.messages;
						}
					}

					res.write(`event: ${eventType}\n`);
					res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
				}
				res.end();
			} catch (error) {
				this.logger.error(`Streaming error: ${error.message}`, error.stack);
				res.write("event: error\n");
				res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
				res.end();
			}
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			this.logger.error(`Chat processing error: ${error.message}`, error.stack);
			throw new BadRequestException(`Failed to process chat: ${error.message}`);
		}
	}

	@Post("save-messages")
	@UseGuards(JwtAuthGuard)
	async saveMessages(
		@Body() saveMessagesDto: SaveMessagesDto,
		@Req() req: any,
	) {
		try {
			// Messages are already formatted as an exchange on the frontend
			// [user, ai, tool_with_metadata, ai, ...]
			await this.chatActionsService.saveMessagesToRegularChat(
				saveMessagesDto.chat_id,
				req.user.id,
				saveMessagesDto.messages,
				saveMessagesDto.messages.findLast((msg) => msg.role === "user")
					?.content || "",
			);

			return { success: true, message: "Messages saved successfully" };
		} catch (error) {
			this.logger.error(`Error saving messages: ${error.message}`, error.stack);
			throw new BadRequestException(
				`Failed to save messages: ${error.message}`,
			);
		}
	}

	@Post("webhook")
	async webhook(
		@Body() body: any,
		@Query("search_space_id") searchSpaceId?: string,
		@Query("user_id") userId?: string,
		@Query("video_url") videoUrl?: string,
	) {
		this.logger.log("BrightData webhook triggered");
		this.logger.debug(
			`Context - searchSpaceId: ${searchSpaceId}, userId: ${userId}, videoUrl: ${videoUrl}`,
		);
		this.logger.debug(`Webhook payload: ${JSON.stringify(body)}`);

		try {
			await this.agentService.processBrightDataWebhook(body, {
				searchSpaceId: searchSpaceId
					? Number.parseInt(searchSpaceId, 10)
					: null,
				userId,
				videoUrl,
			});

			return { message: "Webhook processed successfully" };
		} catch (error) {
			this.logger.error(
				`Error processing BrightData webhook: ${error.message}`,
				error.stack,
			);
			return { message: "Error processing webhook", error: error.message };
		}
	}
}
