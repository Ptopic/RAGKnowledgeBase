"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
const common_1 = require("@nestjs/common");
const agent_service_1 = require("./agent.service");
const chat_dto_1 = require("./dtos/chat.dto");
const embeddings_1 = require("./embeddings");
let AgentController = class AgentController {
    constructor(agentService) {
        this.agentService = agentService;
    }
    chat(body) {
        return this.agentService.chat(body);
    }
    async streamChat(body, res) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        try {
            const stream = this.agentService.streamChat(body);
            stream.subscribe({
                next: (chunk) => {
                    res.write(chunk);
                },
                error: (error) => {
                    console.error('Streaming error:', error);
                    res.write(`\n\nError: ${error.message}`);
                    res.end();
                },
                complete: () => {
                    res.end();
                },
            });
        }
        catch (error) {
            console.error('Stream setup error:', error);
            res.status(500).json({ error: 'Failed to setup stream' });
        }
    }
    async webhook(body) {
        console.log('webhook triggered');
        await Promise.all(body.map(async (video) => {
            await (0, embeddings_1.addYTVideoToVectorStore)(video);
        }));
        return { message: 'Ok' };
    }
};
exports.AgentController = AgentController;
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.ChatDto]),
    __metadata("design:returntype", void 0)
], AgentController.prototype, "chat", null);
__decorate([
    (0, common_1.Post)('chat/stream'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.ChatDto, Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "streamChat", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "webhook", null);
exports.AgentController = AgentController = __decorate([
    (0, common_1.Controller)('agent'),
    __metadata("design:paramtypes", [agent_service_1.AgentService])
], AgentController);
//# sourceMappingURL=agent.controller.js.map