import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { EarningSplit } from '../entities/earning-split.entity';
import { CalculateEarningsUseCase } from './calculate-earnings.use-case';
import { CalculateEarningsInput } from '../dto/calculate-earnings.dto';
import { LedgerQueueService } from '@/core/queue/services/ledger-queue.service';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/modules/finance/ledger/entities/general-ledger-entry.entity';
import { EarningEventType } from '../enums';

export interface DistributeEarningsInput extends CalculateEarningsInput {
  referenceId: string;
}

const eventTypeToLedgerEvent: Record<
  EarningEventType,
  GeneralLedgerEventType
> = {
  [EarningEventType.CHAT]: GeneralLedgerEventType.CONSULTATION,
  [EarningEventType.CALL]: GeneralLedgerEventType.CONSULTATION,
  [EarningEventType.PUJA]: GeneralLedgerEventType.PUJA,
  [EarningEventType.PRODUCT_ORDER]: GeneralLedgerEventType.PRODUCT_ORDER,
  [EarningEventType.USER_SIGNUP]: GeneralLedgerEventType.RECHARGE,
};

@Injectable()
export class DistributeEarningsUseCase {
  private readonly logger = new Logger(DistributeEarningsUseCase.name);

  constructor(
    @InjectRepository(EarningSplit)
    private readonly splitRepo: Repository<EarningSplit>,
    private readonly calculateUseCase: CalculateEarningsUseCase,
    private readonly ledgerQueueService: LedgerQueueService,
  ) {}

  async execute(
    input: DistributeEarningsInput,
    qr?: QueryRunner,
  ): Promise<EarningSplit> {
    const calc = await this.calculateUseCase.execute(input);

    const split = new EarningSplit();
    split.reference_id = input.referenceId;
    split.reference_type = input.eventType;
    split.gross_amount = calc.grossAmount;
    split.platform_earning = calc.platformEarning;
    split.gst_on_platform_fee = calc.gstOnPlatformFee;
    split.provider_earning = calc.providerEarning;
    split.seller_agent_earning = calc.sellerAgentEarning;
    split.buyer_agent_earning = calc.buyerAgentEarning;
    split.referral_earning = calc.referralEarning;
    split.client_profile_id = input.clientProfileId ?? null;
    split.provider_profile_id = input.providerProfileId ?? null;
    split.seller_agent_profile_id = input.sellerAgentProfileId ?? null;
    split.buyer_agent_profile_id = input.buyerAgentProfileId ?? null;
    split.beneficiary_user_id = input.beneficiaryUserId ?? null;
    split.policy_id = calc.policyId;

    const saved = qr
      ? await qr.manager.save(EarningSplit, split)
      : await this.splitRepo.save(split);

    // Enqueue Platform Revenue Ledger Entry
    if (saved.platform_earning > 0) {
      void this.ledgerQueueService.enqueue({
        event_id: saved.reference_id,
        event_type: eventTypeToLedgerEvent[saved.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.PLATFORM,
        party_id: null,
        amount: saved.platform_earning,
        note: `platform_earning for ${saved.reference_type} #${saved.reference_id} (GST: ₹${saved.gst_on_platform_fee})`,
      });
    }

    // Enqueue Agent Commission Ledger Entry if present
    if (saved.seller_agent_earning > 0 && saved.seller_agent_profile_id) {
      void this.ledgerQueueService.enqueue({
        event_id: saved.reference_id,
        event_type: eventTypeToLedgerEvent[saved.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.AGENT,
        party_id: saved.seller_agent_profile_id,
        amount: saved.seller_agent_earning,
        note: `seller_agent_commission for ${saved.reference_type} #${saved.reference_id}`,
      });
    }

    return saved;
  }
}
