import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RetrieverModule } from "../retriever/retriever.module";
import { UploadModule } from "../upload";
import { NotebooksController } from "./notebooks.controller";
import { NotebooksService } from "./notebooks.service";

@Module({
	imports: [UploadModule, RetrieverModule],
	controllers: [NotebooksController],
	providers: [NotebooksService, PrismaService],
	exports: [NotebooksService],
})
export class NotebooksModule {}
