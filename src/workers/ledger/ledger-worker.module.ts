import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@/core/database/database.module';
import { GeneralLedgerEntry } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { LedgerProcessor } from './application/ledger.processor';
import { QueueModule } from '@/core/queue/queue.module';
import configs from '@/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([GeneralLedgerEntry]),
    QueueModule,
  ],
  providers: [LedgerProcessor],
})
export class LedgerWorkerModule { }
