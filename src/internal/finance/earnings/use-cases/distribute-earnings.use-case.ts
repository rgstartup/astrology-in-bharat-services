import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import { earningSplits } from '@/core/drizzledb/schema';
import { CalculateEarningsUseCase } from './calculate-earnings.use-case';
import { CalculateEarningsInput } from '../dto/calculate-earnings.dto';
import { LedgerQueueService } from '../../../../core/queue/services/ledger-queue.service';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '../../ledger/entities/general-ledger-entry.entity';
import { EarningEventType } from '../enum';
import { type EarningSplitDomain, toEarningSplitDomain } from '../earnings.mapper';

export interface DistributeEarningsInput extends CalculateEarningsInput {
  referenceId: string;
}

const eventTypeToLedgerEvent: Record<EarningEventType, GeneralLedgerEventType> =
  {
    [EarningEventType.CHAT]: GeneralLedgerEventType.CONSULTATION,
    [EarningEventType.CALL]: GeneralLedgerEventType.CONSULTATION,
    [EarningEventType.PUJA]: GeneralLedgerEventType.PUJA,
    [EarningEventType.PRODUCT_ORDER]: GeneralLedgerEventType.PRODUCT_ORDER,
  };

@Injectable()
export class DistributeEarningsUseCase {
  private readonly logger = new Logger(DistributeEarningsUseCase.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly calculateUseCase: CalculateEarningsUseCase,
    private readonly ledgerQueueService: LedgerQueueService,
  ) {}

  async execute(
    input: DistributeEarningsInput,
    tx?: DrizzleTx,
  ): Promise<EarningSplitDomain> {
    const calc = await this.calculateUseCase.execute(input);
    const executor = tx ?? this.db;

    const [saved] = await executor
      .insert(earningSplits)
      .values({
        reference_id: input.referenceId,
        reference_type: input.eventType,
        gross_amount: String(calc.grossAmount),
        platform_earning: String(calc.platformEarning),
        gst_on_platform_fee: String(calc.gstOnPlatformFee),
        provider_earning: String(calc.providerEarning),
        seller_agent_earning: String(calc.sellerAgentEarning),
        buyer_agent_earning: String(calc.buyerAgentEarning),
        client_profile_id: input.clientProfileId ?? null,
        provider_profile_id: input.providerProfileId ?? null,
        seller_agent_profile_id: input.sellerAgentProfileId ?? null,
        buyer_agent_profile_id: input.buyerAgentProfileId ?? null,
        policy_id: calc.policyId,
      })
      .returning();

    const domain = toEarningSplitDomain(saved);

    // Enqueue Platform Revenue Ledger Entry
    if (domain.platform_earning > 0) {
      void this.ledgerQueueService.enqueue({
        event_id: domain.reference_id,
        event_type: eventTypeToLedgerEvent[domain.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.PLATFORM,
        party_id: null,
        amount: domain.platform_earning,
        note: `platform_earning for ${domain.reference_type} #${domain.reference_id} (GST: ₹${domain.gst_on_platform_fee})`,
      });
    }

    // Enqueue Agent Commission Ledger Entry if present
    if (domain.seller_agent_earning > 0 && domain.seller_agent_profile_id) {
      void this.ledgerQueueService.enqueue({
        event_id: domain.reference_id,
        event_type: eventTypeToLedgerEvent[domain.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.AGENT,
        party_id: domain.seller_agent_profile_id,
        amount: domain.seller_agent_earning,
        note: `seller_agent_commission for ${domain.reference_type} #${domain.reference_id}`,
      });
    }

    return domain;
  }
}

