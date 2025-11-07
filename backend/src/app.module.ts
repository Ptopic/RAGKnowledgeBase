import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from './agent/agent.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { AppConfigModule } from './config/config.module';
import { validateConfig } from './config/validation.schema';
import { QueueModule } from './queue/queue.module';
import { ConnectorsModule } from './connectors';
import { SearchSpacesModule } from './search-spaces/search-spaces.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatsModule } from './chats/chats.module';
import { SearchSourceConnectorsModule } from './search-source-connectors/search-source-connectors.module';
import { LLMConfigsModule } from './llm-configs/llm-configs.module';
import { LogsModule } from './logs/logs.module';
import { GoogleAuthModule } from './google-auth/google-auth.module';
import { ServicesModule } from './services/services.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validate: validateConfig,
		}),
		AppConfigModule,
		ServicesModule,
		ConnectorsModule,
		QueueModule,
		AuthModule,
		AgentModule,
		SearchSpacesModule,
		DocumentsModule,
		ChatsModule,
		SearchSourceConnectorsModule,
		LLMConfigsModule,
		LogsModule,
		GoogleAuthModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
