import { Observable } from "rxjs";
import { ChatDto } from "./dtos/chat.dto";
export declare class AgentService {
    private readonly llm;
    private readonly memorySaver;
    private readonly promptTemplate;
    private readonly agent;
    chat(chatDto: ChatDto): Promise<import("@langchain/core/messages").MessageContent>;
    streamChat(chatDto: ChatDto): Observable<string>;
}
