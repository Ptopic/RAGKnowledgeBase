import { Global, Module } from "@nestjs/common";
import { AppConfigModule } from "src/config/config.module";
import { CheckpointerService } from "./checkpointer.service";

@Global()
@Module({
	imports: [AppConfigModule],
	providers: [CheckpointerService],
	exports: [CheckpointerService],
})
export class CheckpointerModule {}
