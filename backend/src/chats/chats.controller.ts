import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ChatsService } from './chats.service';
import { StreamConnectorSearchResultsService } from '../tasks/stream-connector-search-results.service';
import {
  CreateChatDto,
  UpdateChatDto,
  ChatDto,
  ChatWithoutMessagesDto,
  AISDKChatRequestDto,
} from '../dtos/chat.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly streamService: StreamConnectorSearchResultsService,
  ) {}

  @Post('chat')
  async handleChatData(
    @Body() request: AISDKChatRequestDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const messages = request.messages;

      if (!messages || messages.length === 0) {
        throw new BadRequestException('Messages array is required');
      }

      if (messages[messages.length - 1].role !== 'user') {
        throw new BadRequestException('Last message must be a user message');
      }

      const userQuery = messages[messages.length - 1].content;
      const requestData = request.data || {};

      const searchSpaceId = requestData.search_space_id;
      if (!searchSpaceId) {
        throw new BadRequestException('search_space_id is required');
      }

      const researchMode = requestData.research_mode || 'standard';
      const selectedConnectors = requestData.selected_connectors || [];
      const documentIdsToAddInContext =
        requestData.document_ids_to_add_in_context || [];
      const searchMode = requestData.search_mode || 'CHUNKS';
      const language = requestData.language || 'English';

      const langchainChatHistory = messages.slice(0, -1).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('x-vercel-ai-data-stream', 'v1');

      const generator = this.streamService.streamConnectorSearchResults({
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

      for await (const chunk of generator) {
        res.write(chunk);
      }

      res.end();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to process chat: ${error.message}`);
    }
  }

  @Post('chats')
  async create(
    @Body() createDto: CreateChatDto,
    @Req() req: any,
  ): Promise<ChatDto> {
    return this.chatsService.create(createDto, req.user.id);
  }

  @Get('chats')
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search_space_id') searchSpaceId?: string,
  ): Promise<ChatWithoutMessagesDto[]> {
    const skipNum = skip !== undefined ? parseInt(skip, 10) : 0;
    const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
    const searchSpaceIdNum =
      searchSpaceId !== undefined ? parseInt(searchSpaceId, 10) : undefined;
    return this.chatsService.findAll(
      req.user.id,
      skipNum,
      limitNum,
      searchSpaceIdNum,
    );
  }

  @Get('chats/:id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ChatDto> {
    return this.chatsService.findOne(id, req.user.id);
  }

  @Put('chats/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateChatDto,
    @Req() req: any,
  ): Promise<ChatDto> {
    return this.chatsService.update(id, updateDto, req.user.id);
  }

  @Delete('chats/:id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.chatsService.remove(id, req.user.id);
  }
}
