import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import {
  CommissionSplit,
  SplitReferenceType,
} from '../entities/commission-split.entity';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/modules/finance/ledger/entities/general-ledger-entry.entity';
import { LedgerQueueService } from '@/core/queue/services/ledger-queue.service';

export interface CommissionSplitInput {
  referenceId: string | number;
  referenceType: SplitReferenceType;
  grossAmount: number;
  platformFee?: number;
  gst?: number;
  sellerAgentCommission?: number;
  buyerAgentCommission?: number;
  referralCommission?: number;
  providerNet: number;
  clientProfileId?: number | string | null;
  providerProfileId?: number | string | null;
  sellerAgentProfileId?: number | string | null;
  buyerAgentProfileId?: number | string | null;
  beneficiaryUserId?: number | string | null;
  commissionRuleId?: number | string | null;
}

const splitRefTypeToLedgerEventType: Record<
  SplitReferenceType,
  GeneralLedgerEventType
> = {
  [SplitReferenceType.CHAT]: GeneralLedgerEventType.CONSULTATION,
  [SplitReferenceType.CALL]: GeneralLedgerEventType.CONSULTATION,
  [SplitReferenceType.PUJA]: GeneralLedgerEventType.PUJA,
  [SplitReferenceType.ORDER]: GeneralLedgerEventType.PRODUCT_ORDER,
};

@Injectable()
export class CreateCommissionSplitUseCase {
  private readonly logger = new Logger(CreateCommissionSplitUseCase.name);

  constructor(
    @InjectRepository(CommissionSplit)
    private readonly splitRepo: Repository<CommissionSplit>,
    private readonly ledgerQueueService: LedgerQueueService,
  ) {}

  async execute(
    input: CommissionSplitInput,
    qr?: QueryRunner,
  ): Promise<CommissionSplit> {
    const split = new CommissionSplit();
    split.reference_id = String(input.referenceId);
    split.reference_type = input.referenceType;
    split.gross_amount = input.grossAmount;
    split.gst = input.gst ?? 0;
    split.seller_agent_commission = input.sellerAgentCommission ?? 0;
    split.buyer_agent_commission = input.buyerAgentCommission ?? 0;
    split.referral_commission = input.referralCommission ?? 0;
    split.provider_net = input.providerNet;
    split.client_profile_id =
      input.clientProfileId != null ? Number(input.clientProfileId) : null;
    split.provider_profile_id =
      input.providerProfileId != null ? Number(input.providerProfileId) : null;
    split.seller_agent_profile_id =
      input.sellerAgentProfileId != null
        ? Number(input.sellerAgentProfileId)
        : null;
    split.buyer_agent_profile_id =
      input.buyerAgentProfileId != null
        ? Number(input.buyerAgentProfileId)
        : null;
    split.beneficiary_user_id =
      input.beneficiaryUserId != null ? Number(input.beneficiaryUserId) : null;
    split.commission_rule_id =
      input.commissionRuleId != null ? Number(input.commissionRuleId) : null;

    const saved = qr
      ? await qr.manager.save(CommissionSplit, split)
      : await this.splitRepo.save(split);

    // Enqueue agent commission entries if applicable
    if (saved.seller_agent_commission > 0 && saved.seller_agent_profile_id) {
      void this.ledgerQueueService.enqueue({
        event_id: saved.reference_id,
        event_type: splitRefTypeToLedgerEventType[saved.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.AGENT,
        party_id: saved.seller_agent_profile_id,
        amount: saved.seller_agent_commission,
        note: `seller_agent_commission for ${saved.reference_type} #${saved.reference_id}`,
      });
    }

    if (saved.buyer_agent_commission > 0 && saved.buyer_agent_profile_id) {
      void this.ledgerQueueService.enqueue({
        event_id: saved.reference_id,
        event_type: splitRefTypeToLedgerEventType[saved.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.AGENT,
        party_id: saved.buyer_agent_profile_id,
        amount: saved.buyer_agent_commission,
        note: `buyer_agent_commission for ${saved.reference_type} #${saved.reference_id}`,
      });
    }

    return saved;
  }
}
