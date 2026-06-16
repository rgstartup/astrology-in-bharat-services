import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import {
  LedgerEntry,
  LedgerReferenceType,
} from '../../infrastructure/entities/ledger-entry.entity';

export interface LedgerEntryInput {
  referenceId: string;
  referenceType: LedgerReferenceType;
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
export class CreateLedgerEntryUseCase {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
  ) {}

  async execute(
    input: LedgerEntryInput,
    qr?: QueryRunner,
  ): Promise<LedgerEntry> {
    const entry = new LedgerEntry();
    entry.reference_id = input.referenceId;
    entry.reference_type = input.referenceType;
    entry.gross_amount = input.grossAmount;
    entry.platform_fee = input.platformFee;
    entry.gst = input.gst;
    entry.seller_agent_commission = input.sellerAgentCommission;
    entry.buyer_agent_commission = input.buyerAgentCommission;
    entry.provider_net = input.providerNet;
    entry.platform_net = Number((input.platformFee + input.gst).toFixed(2));
    entry.client_profile_id = input.clientProfileId ?? null;
    entry.provider_profile_id = input.providerProfileId ?? null;
    entry.seller_agent_profile_id = input.sellerAgentProfileId ?? null;
    entry.buyer_agent_profile_id = input.buyerAgentProfileId ?? null;
    entry.commission_rule_id = input.commissionRuleId ?? null;

    if (qr) {
      return qr.manager.save(LedgerEntry, entry);
    }
    return this.ledgerRepo.save(entry);
  }
}
