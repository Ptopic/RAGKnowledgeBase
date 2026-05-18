import { forwardRef, Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RetrieverModule } from "../retriever/retriever.module";
import { TasksModule } from "../tasks/tasks.module";
import { UploadModule } from "../upload";
import { NotebooksController } from "./notebooks.controller";
import { NotebooksService } from "./notebooks.service";

@Module({
	imports: [UploadModule, RetrieverModule, forwardRef(() => TasksModule)],
	controllers: [NotebooksController],
	providers: [NotebooksService, PrismaService],
	exports: [NotebooksService],
})
export class NotebooksModule {}
