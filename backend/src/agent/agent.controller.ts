import { Body, Controller, Logger, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { AgentService } from "./agent.service";
import type { ChatDto } from "./dtos/chat.dto";
import type { ResearcherDto } from "./dtos/researcher.dto";

@Controller("agent")
export class AgentController {
	private readonly logger = new Logger(AgentController.name);

	constructor(private readonly agentService: AgentService) {}

	@Post("chat")
	chat(@Body() body: ChatDto) {
		return this.agentService.chat(body);
	}

	@Post("chat/stream")
	async streamChat(@Body() body: ChatDto, @Res() res: Response) {
		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");

		try {
			const stream = this.agentService.streamChat(body);

			stream.subscribe({
				next: (chunk) => {
					res.write(chunk);
				},
				error: (error) => {
					console.error("Streaming error:", error);
					res.write(`\n\nError: ${error.message}`);
					res.end();
				},
				complete: () => {
					res.end();
				},
			});
		} catch (error) {
			console.error("Stream setup error:", error);
			res.status(500).json({ error: "Failed to setup stream" });
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
				searchSpaceId: searchSpaceId ? Number.parseInt(searchSpaceId, 10) : null,
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

	@Post("researcher/stream")
	async streamResearcher(@Body() body: ResearcherDto, @Res() res: Response) {
		res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");

		try {
			const stream = this.agentService.streamResearcher(body);

			stream.subscribe({
				next: (chunk) => {
					res.write(chunk);
				},
				error: (error) => {
					console.error("Researcher streaming error:", error);
					res.write(
						JSON.stringify({
							type: "error",
							message: `Error: ${error.message}`,
						}) + "\n",
					);
					res.end();
				},
				complete: () => {
					res.end();
				},
			});
		} catch (error) {
			console.error("Researcher stream setup error:", error);
			res.status(500).json({ error: "Failed to setup researcher stream" });
		}
	}
}
