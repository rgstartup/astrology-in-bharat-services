import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralLedgerEntry } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import {
  LedgerJobPayload,
  LEDGER_QUEUE,
  LEDGER_JOB,
} from '@/core/queue/services/ledger-queue.service';

@Processor(LEDGER_QUEUE)
export class LedgerProcessor extends WorkerHost {
  private readonly logger = new Logger(LedgerProcessor.name);

  constructor(
    @InjectRepository(GeneralLedgerEntry)
    private readonly repo: Repository<GeneralLedgerEntry>,
  ) {
    super();
  }

  async process(job: Job<LedgerJobPayload>): Promise<void> {
    if (job.name !== LEDGER_JOB) return;

    this.logger.debug(
      `[LEDGER_WORKER] Processing job ${job.id} — ${job.data.entry_type} ${job.data.party_type} ₹${job.data.amount}`,
    );

    const entry = this.repo.create({
      event_id: job.data.event_id,
      event_type: job.data.event_type,
      entry_type: job.data.entry_type,
      party_type: job.data.party_type,
      party_id: job.data.party_id,
      amount: job.data.amount,
      note: job.data.note ?? null,
    });

    await this.repo.save(entry);

    this.logger.debug(`[LEDGER_WORKER] Job ${job.id} written to DB`);
  }
}
