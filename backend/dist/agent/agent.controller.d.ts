import { Response } from 'express';
import { AgentService } from './agent.service';
import { ChatDto } from './dtos/chat.dto';
export declare class AgentController {
    private readonly agentService;
    constructor(agentService: AgentService);
    chat(body: ChatDto): Promise<import("@langchain/core/messages").MessageContent>;
    streamChat(body: ChatDto, res: Response): Promise<void>;
    webhook(body: any): Promise<{
        message: string;
    }>;
}
