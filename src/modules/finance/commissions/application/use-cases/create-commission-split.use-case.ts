import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import {
  CommissionSplit,
  SplitReferenceType,
} from '../../infrastructure/entities/commission-split.entity';

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

@Injectable()
export class CreateCommissionSplitUseCase {
  constructor(
    @InjectRepository(CommissionSplit)
    private readonly splitRepo: Repository<CommissionSplit>,
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

    if (qr) {
      return qr.manager.save(CommissionSplit, split);
    }
    return this.splitRepo.save(split);
  }
}
