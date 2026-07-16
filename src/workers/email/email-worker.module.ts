import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalModule } from '@/external/external.module';
import { EmailProcessor } from './application/email.processor';
import { QueueModule } from '@/core/queue/queue.module';
import { DatabaseModule } from '@/core/database/database.module';
import configs from '@/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    DatabaseModule,
    ExternalModule, // Brings in NodeMailerService
    QueueModule,
  ],
  providers: [EmailProcessor],
})
export class EmailWorkerModule {}
