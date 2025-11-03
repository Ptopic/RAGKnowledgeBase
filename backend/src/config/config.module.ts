import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

/**
 * Global configuration module
 * Makes ConfigService available throughout the application
 */
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class AppConfigModule {}
