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

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validate: validateConfig,
		}),
		AppConfigModule,
		ConnectorsModule,
		QueueModule,
		AuthModule,
		AgentModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
