import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadModule } from "../upload";
import { NotebooksController } from "./notebooks.controller";
import { NotebooksService } from "./notebooks.service";

@Module({
	imports: [UploadModule],
	controllers: [NotebooksController],
	providers: [NotebooksService, PrismaService],
	exports: [NotebooksService],
})
export class NotebooksModule {}
