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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentsDto,
  UpdateDocumentDto,
  DocumentDto,
  DocumentWithChunksDto,
  PaginatedResponseDto,
} from '../dtos/document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async create(
    @Body() createDto: CreateDocumentsDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.documentsService.create(createDto, req.user.id);
  }

  @Post('fileupload')
  @UseInterceptors(FilesInterceptor('files'))
  async createFileUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('search_space_id', ParseIntPipe) searchSpaceId: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    if (!searchSpaceId) {
      throw new BadRequestException('search_space_id is required');
    }
    return this.documentsService.createFileUpload(
      files,
      searchSpaceId,
      req.user.id,
    );
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Query('search_space_id') searchSpaceId?: string,
    @Query('document_types') documentTypes?: string,
  ): Promise<PaginatedResponseDto<DocumentDto>> {
    const skipNum = skip !== undefined ? parseInt(skip, 10) : undefined;
    const pageNum = page !== undefined ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize !== undefined ? parseInt(pageSize, 10) : 50;
    const searchSpaceIdNum =
      searchSpaceId !== undefined ? parseInt(searchSpaceId, 10) : undefined;

    return this.documentsService.findAll(
      req.user.id,
      skipNum,
      pageNum,
      pageSizeNum,
      searchSpaceIdNum,
      documentTypes,
    );
  }

  @Get('search')
  async search(
    @Req() req: any,
    @Query('title') title: string,
    @Query('skip') skip?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Query('search_space_id') searchSpaceId?: string,
    @Query('document_types') documentTypes?: string,
  ): Promise<PaginatedResponseDto<DocumentDto>> {
    if (!title) {
      throw new BadRequestException('title query parameter is required');
    }

    const skipNum = skip !== undefined ? parseInt(skip, 10) : undefined;
    const pageNum = page !== undefined ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize !== undefined ? parseInt(pageSize, 10) : 50;
    const searchSpaceIdNum =
      searchSpaceId !== undefined ? parseInt(searchSpaceId, 10) : undefined;

    return this.documentsService.search(
      req.user.id,
      title,
      skipNum,
      pageNum,
      pageSizeNum,
      searchSpaceIdNum,
      documentTypes,
    );
  }

  @Get('type-counts')
  async getTypeCounts(
    @Req() req: any,
    @Query('search_space_id') searchSpaceId?: string,
  ): Promise<Record<string, number>> {
    const searchSpaceIdNum =
      searchSpaceId !== undefined ? parseInt(searchSpaceId, 10) : undefined;
    return this.documentsService.getTypeCounts(req.user.id, searchSpaceIdNum);
  }

  @Get('by-chunk/:chunkId')
  async getDocumentByChunkId(
    @Param('chunkId', ParseIntPipe) chunkId: number,
    @Req() req: any,
  ): Promise<DocumentWithChunksDto> {
    return this.documentsService.getDocumentByChunkId(chunkId, req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<DocumentDto> {
    return this.documentsService.findOne(id, req.user.id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentDto,
    @Req() req: any,
  ): Promise<DocumentDto> {
    return this.documentsService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<{ message: string }> {
    return this.documentsService.remove(id, req.user.id);
  }
}
