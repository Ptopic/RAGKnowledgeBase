import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { AgentModule } from "./agent/agent.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { NotebooksModule } from "./notebooks/notebooks.module";
import { ChatShareModule } from "./chat-share/chat-share.module";
import { ChatsModule } from "./chats/chats.module";
import { AppConfigModule } from "./config/config.module";
import configuration from "./config/configuration";
import { ConnectorsModule } from "./connectors";
import { DocumentsModule } from "./documents/documents.module";
import { GoogleAuthModule } from "./google-auth/google-auth.module";
import { LLMConfigsModule } from "./llm-configs/llm-configs.module";
import { LogsModule } from "./logs/logs.module";
import { QueueModule } from "./queue/queue.module";
import { SearchSourceConnectorsModule } from "./search-source-connectors/search-source-connectors.module";
import { SearchSpacesModule } from "./search-spaces/search-spaces.module";
import { QueryTemplatesModule } from "./query-templates/query-templates.module";
import { ServicesModule } from "./services/services.module";
import { RedisModule } from "./redis/redis.module";
import { SseModule } from "./sse/sse.module";
import { AdminModule } from "./admin/admin.module";
import { SubscriptionModule } from "./subscription/subscription.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
		}),
		ScheduleModule.forRoot(),
		ThrottlerModule.forRoot([{
			name: 'default',
			limit: 10,
			ttl: 900000,
		}]),
		AppConfigModule,
		ServicesModule,
		ConnectorsModule,
		QueueModule,
		AuthModule,
		AgentModule,
		ApiKeysModule,
		SearchSpacesModule,
		DocumentsModule,
		ChatsModule,
		NotebooksModule,
		ChatShareModule,
		SearchSourceConnectorsModule,
		LLMConfigsModule,
		QueryTemplatesModule,
		LogsModule,
		GoogleAuthModule,
		RedisModule,
		SseModule,
		AdminModule,
		SubscriptionModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
