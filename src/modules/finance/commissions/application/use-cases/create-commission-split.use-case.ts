import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import {
  CommissionSplit,
  SplitReferenceType,
} from '../../infrastructure/entities/commission-split.entity';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { LedgerQueueService } from '@/modules/queue/services/ledger-queue.service';

export interface CommissionSplitInput {
  referenceId: string;
  referenceType: SplitReferenceType;
  grossAmount: number;
  platformFee: number;
  gst: number;
  sellerAgentCommission: number;
  buyerAgentCommission: number;
  providerNet: number;
  clientProfileId?: string | null;
  providerProfileId?: string | null;
  sellerAgentProfileId?: string | null;
  buyerAgentProfileId?: string | null;
  commissionRuleId?: string | null;
}

const splitRefTypeToLedgerEventType: Record<SplitReferenceType, GeneralLedgerEventType> = {
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
    split.reference_id = input.referenceId;
    split.reference_type = input.referenceType;
    split.gross_amount = input.grossAmount;
    split.platform_fee = input.platformFee;
    split.gst = input.gst;
    split.seller_agent_commission = input.sellerAgentCommission;
    split.buyer_agent_commission = input.buyerAgentCommission;
    split.provider_net = input.providerNet;
    split.platform_net = Number((input.platformFee + input.gst).toFixed(2));
    split.client_profile_id = input.clientProfileId ?? null;
    split.provider_profile_id = input.providerProfileId ?? null;
    split.seller_agent_profile_id = input.sellerAgentProfileId ?? null;
    split.buyer_agent_profile_id = input.buyerAgentProfileId ?? null;
    split.commission_rule_id = input.commissionRuleId ?? null;

    const saved = qr
      ? await qr.manager.save(CommissionSplit, split)
      : await this.splitRepo.save(split);

    // Enqueue platform revenue entry — fire-and-forget
    if (saved.platform_net > 0) {
      void this.ledgerQueueService.enqueue({
        event_id: saved.reference_id,
        event_type: splitRefTypeToLedgerEventType[saved.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.PLATFORM,
        party_id: null,
        amount: saved.platform_net,
        note: `platform_fee=${saved.platform_fee} gst=${saved.gst}`,
      });
    }

    return saved;
  }
}
