import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadModule } from "../upload";
import { NotebooksController } from "./notebooks.controller";
import { NotebooksService } from "./notebooks.service";
import { PublicNotebooksController } from "./public/public-notebooks.controller";

@Module({
	imports: [UploadModule],
	controllers: [NotebooksController, PublicNotebooksController],
	providers: [NotebooksService, PrismaService],
	exports: [NotebooksService],
})
export class NotebooksModule {}
