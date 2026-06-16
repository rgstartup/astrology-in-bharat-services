import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { CreateCommissionRuleUseCase } from './use-cases/create-commission-rule.use-case';
import { UpdateCommissionRuleUseCase } from './use-cases/update-commission-rule.use-case';
import { ListCommissionRulesUseCase } from './use-cases/list-commission-rules.use-case';
import {
  GetLedgerUseCase,
  LedgerSummary,
} from './use-cases/get-ledger.use-case';
import { ResolveCommissionUseCase } from './use-cases/resolve-commission.use-case';
import {
  CreateLedgerEntryUseCase,
  LedgerEntryInput,
} from './use-cases/create-ledger-entry.use-case';
import { CreateCommissionRuleDto } from '../api/dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from '../api/dto/update-commission-rule.dto';
import { QueryCommissionRulesDto } from '../api/dto/query-commission-rules.dto';
import {
  QueryLedgerDto,
  QueryLedgerSummaryDto,
} from '../api/dto/query-ledger.dto';
import {
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '../infrastructure/entities/commission-rule.entity';
import { CommissionRule } from '../infrastructure/entities/commission-rule.entity';
import { LedgerEntry } from '../infrastructure/entities/ledger-entry.entity';

export {
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
  LedgerEntryInput,
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  QueryCommissionRulesDto,
  QueryLedgerDto,
  QueryLedgerSummaryDto,
  LedgerSummary,
};

@Injectable()
export class CommissionsFacade {
  constructor(
    private readonly createCommissionRuleUseCase: CreateCommissionRuleUseCase,
    private readonly updateCommissionRuleUseCase: UpdateCommissionRuleUseCase,
    private readonly listCommissionRulesUseCase: ListCommissionRulesUseCase,
    private readonly getLedgerUseCase: GetLedgerUseCase,
    private readonly resolveCommissionUseCase: ResolveCommissionUseCase,
    private readonly createLedgerEntryUseCase: CreateLedgerEntryUseCase,
  ) {}

  createRule(dto: CreateCommissionRuleDto): Promise<CommissionRule> {
    return this.createCommissionRuleUseCase.execute(dto);
  }

  updateRule(
    id: string,
    dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRule> {
    return this.updateCommissionRuleUseCase.execute(id, dto);
  }

  deactivateRule(id: string): Promise<CommissionRule> {
    return this.updateCommissionRuleUseCase.execute(id, { is_active: false });
  }

  listRules(query: QueryCommissionRulesDto = {}): Promise<CommissionRule[]> {
    return this.listCommissionRulesUseCase.execute(query);
  }

  getLedger(query: QueryLedgerDto = {}): Promise<{
    data: LedgerEntry[];
    meta: { total: number; limit: number; offset: number };
  }> {
    return this.getLedgerUseCase.execute(query);
  }

  getLedgerSummary(query: QueryLedgerSummaryDto = {}): Promise<LedgerSummary> {
    return this.getLedgerUseCase.summary(query);
  }

  resolveCommission(
    eventType: CommissionEventType,
    commissionType: CommissionType,
    profileId: string | null,
    role: CommissionAppliesRole,
    grossAmount: number,
  ): Promise<{ amount: number; ruleId: string | null }> {
    return this.resolveCommissionUseCase.execute(
      eventType,
      commissionType,
      profileId,
      role,
      grossAmount,
    );
  }

  createLedgerEntry(
    input: LedgerEntryInput,
    qr?: QueryRunner,
  ): Promise<LedgerEntry> {
    return this.createLedgerEntryUseCase.execute(input, qr);
  }
}
