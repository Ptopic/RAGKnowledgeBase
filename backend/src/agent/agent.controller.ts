import {
	BadRequestException,
	Body,
	Controller,
	Logger,
	Post,
	Query,
	Req,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MemberRole } from "@prisma/client";
import * as crypto from "crypto";
import { Response as ExpressResponse } from "express";
import * as fs from "fs";
import { diskStorage } from "multer";
import * as path from "path";
import { JwtAuthGuard } from "src/auth/guards/jwt.guard";
import { AgentChatRequestDto, SaveMessagesDto } from "src/chats/dtos/chat.dto";
import { RequiresCredits } from "src/subscription/decorators/requires-credits.decorator";
import { CreditsRequiredGuard } from "src/subscription/guards/credits-required.guard";
import { RequireSearchSpaceRole } from "src/permissions/decorators/require-search-space-role.decorator";
import { SearchSpaceAccessGuard } from "src/permissions/guards/search-space-access.guard";
import { UsageOperation } from "../subscription/credit-cost";
import { CreditTrackingHandler } from "../subscription/credit-tracking.handler";
import {
	CreditsExceededError,
	SubscriptionService,
} from "../subscription/subscription.service";
import { AgentService } from "./agent.service";
import { ChatActionsService } from "./services/chat-actions.service";
import { DeepAgentService } from "./services/deep-agent.service";
import { LLMService } from "./services/llm.service";
import {
	getInitialThinkingStep,
	resetThinkingStepCounter,
} from "./utils/thinking-steps";

const chatUploadsDir = path.join(process.cwd(), "uploads", "chat-files");
if (!fs.existsSync(chatUploadsDir)) {
	fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const chatFileStorage = diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, chatUploadsDir);
	},
	filename: (_req, file, cb) => {
		const hash = crypto.randomBytes(8).toString("hex");
		const ext = path.extname(file.originalname);
		const name = path.basename(file.originalname, ext);
		cb(null, `${name}-${hash}${ext}`);
	},
});

function extractTextFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter(
			(part): part is Record<string, unknown> & { type: string } =>
				typeof part === "object" && part !== null && "type" in part,
		)
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text as string)
		.join("")
		.trim();
}

@Controller("agent")
export class AgentController {
	private readonly logger = new Logger(AgentController.name);

	constructor(
		private readonly agentService: AgentService,
		private readonly deepAgentService: DeepAgentService,
		private readonly chatActionsService: ChatActionsService,
		private readonly llmService: LLMService,
		private readonly subscriptionService: SubscriptionService,
	) {}

	@Post("upload-chat-file")
	@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard, CreditsRequiredGuard)
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	@RequiresCredits(1)
	@UseInterceptors(FileInterceptor("file", { storage: chatFileStorage }))
	async uploadChatFile(
		@UploadedFile() file: Express.Multer.File | undefined,
		@Req() _req: any,
	) {
		if (!file) {
			throw new BadRequestException("No file uploaded");
		}

		return {
			filePath: file.path,
			fileName: file.originalname,
			mimetype: file.mimetype,
			size: file.size,
		};
	}

	@Post("chatWithDeepAgent")
	@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard, CreditsRequiredGuard)
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	@RequiresCredits(1)
	async chatWithDeepAgent(
		@Body() request: AgentChatRequestDto,
		@Req() req: any,
		@Res() res: ExpressResponse,
	) {
		const creditHandler = new CreditTrackingHandler();
		try {
			const messages = request.messages;

			if (!messages || messages.length === 0) {
				throw new BadRequestException("Messages array is required");
			}

			if (messages[messages.length - 1].role !== "user") {
				throw new BadRequestException("Last message must be a user message");
			}

			const userContent = messages[messages.length - 1].content;
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

			const {
				stream,
				chatId: createdChatId,
				chatWasCreated,
				billedToUserKey,
			} = await this.deepAgentService.streamDeepAgent({
				userQuery: userContent,
				userId: req.user.id,
				searchSpaceId,
				selectedConnectors,
				documentIdsToAddInContext,
				language,
				chatId,
				creditHandler,
			});

			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");

			if (chatWasCreated && createdChatId) {
				res.setHeader("X-Chat-Id", createdChatId.toString());
			}

			resetThinkingStepCounter();

			const userQueryText = extractTextFromContent(userContent);
			const initialStep = getInitialThinkingStep(userQueryText);
			res.write("event: custom\n");
			res.write(
				`data: ${JSON.stringify({ type: "thinking", ...initialStep })}\n\n`,
			);

			let streamSucceeded = false;
			try {
				for await (const chunk of stream) {
					res.write(chunk);
				}
				res.end();
				streamSucceeded = true;
			} catch (error) {
				this.logger.error(`Streaming error: ${error.message}`, error.stack);
				res.write("event: error\n");
				res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
				res.end();
			}

			if (streamSucceeded) {
				await this.recordUsage(
					req.user.id,
					searchSpaceId,
					creditHandler,
					UsageOperation.DEEP_AGENT_MSG,
					billedToUserKey,
				);
			}
		} catch (error) {
			if (
				error instanceof CreditsExceededError ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			this.logger.error(`Chat processing error: ${error.message}`, error.stack);
			throw new BadRequestException(`Failed to process chat: ${error.message}`);
		}
	}

	@Post("chat")
	@UseGuards(JwtAuthGuard, SearchSpaceAccessGuard, CreditsRequiredGuard)
	@RequireSearchSpaceRole(MemberRole.VIEWER)
	@RequiresCredits(1)
	async handleChatData(
		@Body() request: AgentChatRequestDto,
		@Req() req: any,
		@Res() res: ExpressResponse,
	) {
		const creditHandler = new CreditTrackingHandler();
		try {
			const messages = request.messages;

			if (!messages || messages.length === 0) {
				throw new BadRequestException("Messages array is required");
			}

			if (messages[messages.length - 1].role !== "user") {
				throw new BadRequestException("Last message must be a user message");
			}

			const userContent = messages[messages.length - 1].content;
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
				billedToUserKey,
			} = await this.agentService.streamConnectorSearchResults({
				userQuery: extractTextFromContent(userContent),
				userId: req.user.id,
				searchSpaceId,
				researchMode,
				selectedConnectors,
				searchModeStr: searchMode,
				documentIdsToAddInContext,
				language,
				chatId,
				creditHandler,
			});

			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");

			if (chatWasCreated && createdChatId) {
				res.setHeader("X-Chat-Id", createdChatId.toString());
			}

			let streamSucceeded = false;
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
				streamSucceeded = true;
			} catch (error) {
				this.logger.error(`Streaming error: ${error.message}`, error.stack);
				res.write("event: error\n");
				res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
				res.end();
			}

			if (streamSucceeded) {
				await this.recordUsage(
					req.user.id,
					searchSpaceId,
					creditHandler,
					UsageOperation.RESEARCHER_MSG,
					billedToUserKey,
				);
			}
		} catch (error) {
			if (
				error instanceof CreditsExceededError ||
				error instanceof BadRequestException
			) {
				throw error;
			}
			this.logger.error(`Chat processing error: ${error.message}`, error.stack);
			throw new BadRequestException(`Failed to process chat: ${error.message}`);
		}
	}

	private async recordUsage(
		userId: string,
		searchSpaceId: number,
		tracker: CreditTrackingHandler,
		operationType: string,
		billedToUserKey: boolean,
	): Promise<void> {
		tracker.reportCaptureOutcome(operationType);
		const totals = tracker.totals();
		try {
			await this.subscriptionService.enqueueDeduction({
				userId,
				searchSpaceId,
				operationType,
				tokensIn: totals.tokensIn,
				tokensOut: totals.tokensOut,
				modelName: totals.modelName,
				billedToUserKey,
			});
		} catch (err) {
			this.logger.error(
				`Failed to enqueue credit deduction for user ${userId} (${operationType}): ${(err as Error).message}`,
				(err as Error).stack,
			);
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
		@Query("document_id") documentId?: string,
	) {
		this.logger.log("BrightData webhook triggered");
		this.logger.debug(
			`Context - searchSpaceId: ${searchSpaceId}, userId: ${userId}, videoUrl: ${videoUrl}, documentId: ${documentId}`,
		);
		this.logger.debug(`Webhook payload: ${JSON.stringify(body)}`);

		try {
			await this.agentService.processBrightDataWebhook(body, {
				searchSpaceId: searchSpaceId
					? Number.parseInt(searchSpaceId, 10)
					: null,
				userId,
				videoUrl,
				documentId: documentId ? Number.parseInt(documentId, 10) : undefined,
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
