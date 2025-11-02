import { Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { AgentService } from "./agent.service";
import type { ChatDto } from "./dtos/chat.dto";

@Controller("agent")
export class AgentController {
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
	async webhook(@Body() body: any) {
		console.log("webhook triggered");
		// TODO: Implement video processing logic
		return { message: "Ok" };
	}
}
