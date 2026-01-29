import {
	BadRequestException,
	Body,
	Controller,
	Logger,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt.guard";
import { AISDKChatRequestDto } from "src/chats/dtos/chat.dto";
import { AgentService } from "./agent.service";

@Controller("agent")
@UseGuards(JwtAuthGuard)
export class AgentController {
	private readonly logger = new Logger(AgentController.name);

	constructor(private readonly agentService: AgentService) {}

	@Post("chat")
	async handleChatData(@Body() request: AISDKChatRequestDto, @Req() req: any) {
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

			const searchSpaceId = requestData.search_space_id;
			if (!searchSpaceId) {
				throw new BadRequestException("search_space_id is required");
			}

			const researchMode = requestData.research_mode || "standard";
			const selectedConnectors = requestData.selected_connectors || [];
			const documentIdsToAddInContext =
				requestData.document_ids_to_add_in_context || [];
			const searchMode = requestData.search_mode || "CHUNKS";
			const language = requestData.language || "English";

			const langchainChatHistory = messages.slice(0, -1).map((msg: any) => ({
				role: msg.role,
				content: msg.content,
			}));

			const response = await this.agentService.streamConnectorSearchResults({
				userQuery,
				userId: req.user.id,
				searchSpaceId,
				researchMode,
				selectedConnectors,
				langchainChatHistory,
				searchModeStr: searchMode,
				documentIdsToAddInContext,
				language,
			});

			// Return the Response object directly
			return response;
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(`Failed to process chat: ${error.message}`);
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
			// Process the BrightData webhook response with context from query params
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
