import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@/core/database/database.module';
import { GeneralLedgerEntry } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { LedgerProcessor } from './application/ledger.processor';
import { RedisConfig } from '@/config/redis.config';
import { LEDGER_QUEUE } from '@/modules/queue/services/ledger-queue.service';
import configs from '@/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([GeneralLedgerEntry]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>('redis');
        return {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: LEDGER_QUEUE }),
  ],
  providers: [LedgerProcessor],
})
export class LedgerWorkerModule {}
