import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';

export interface LedgerJobPayload {
  event_id: string | null;
  event_type: GeneralLedgerEventType;
  entry_type: GeneralLedgerEntryType;
  party_type: GeneralLedgerPartyType;
  party_id: string | null;
  amount: number;
  note?: string | null;
}

export const LEDGER_QUEUE = 'ledger';
export const LEDGER_JOB = 'write-ledger-entry';

@Injectable()
export class LedgerQueueService {
  private readonly logger = new Logger(LedgerQueueService.name);

  constructor(@InjectQueue(LEDGER_QUEUE) private readonly queue: Queue) {}

  async enqueue(payload: LedgerJobPayload): Promise<void> {
    try {
      await this.queue.add(LEDGER_JOB, payload, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } catch (err) {
      // Never throw — ledger queue failure must not affect money movement
      this.logger.error(
        `[LEDGER_QUEUE] Failed to enqueue entry: ${(err as Error).message}`,
      );
    }
  }
}
