import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueService } from './services/email-queue.service';
import {
  LedgerQueueService,
  LEDGER_QUEUE,
} from './services/ledger-queue.service';
import { RedisConfig } from '@/config/redis.config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        return {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password,
            username: redisConfig?.username,
            tls: redisConfig?.tls,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: 'email' }, { name: LEDGER_QUEUE }),
  ],
  providers: [EmailQueueService, LedgerQueueService],
  exports: [EmailQueueService, LedgerQueueService, BullModule],
})
export class QueueModule {}
