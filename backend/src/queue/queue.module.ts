import { BullModule } from '@nestjs/bull';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { ConnectorsProcessor } from './processors/connectors.processor';
import { CreditDeductionsProcessor } from './processors/credit-deductions.processor';
import { DocumentsProcessor } from './processors/documents.processor';
import { SchedulerProcessor } from './processors/scheduler.processor';
import { bullConfig, QUEUE_NAMES } from './queue.config';
import { QueueService } from './queue.service';

/**
 * Queue module for Bull
 */
@Module({
  imports: [
    BullModule.forRoot(bullConfig),

    BullModule.registerQueue(
      { name: QUEUE_NAMES.DOCUMENTS },
      { name: QUEUE_NAMES.CONNECTORS },
      { name: QUEUE_NAMES.SCHEDULER },
      { name: QUEUE_NAMES.CREDIT_DEDUCTIONS },
    ),

    PrismaModule,
    TasksModule,
    forwardRef(() => SubscriptionModule),
  ],
  providers: [
    DocumentsProcessor,
    ConnectorsProcessor,
    SchedulerProcessor,
    CreditDeductionsProcessor,
    QueueService,
  ],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
