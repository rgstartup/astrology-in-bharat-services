import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { CreateCommissionRuleUseCase } from './use-cases/create-commission-rule.use-case';
import { UpdateCommissionRuleUseCase } from './use-cases/update-commission-rule.use-case';
import { ListCommissionRulesUseCase } from './use-cases/list-commission-rules.use-case';
import {
  GetCommissionSplitsUseCase,
  CommissionSplitsSummary,
} from './use-cases/get-commission-splits.use-case';
import { ResolveCommissionUseCase } from './use-cases/resolve-commission.use-case';
import {
  CreateCommissionSplitUseCase,
  CommissionSplitInput,
} from './use-cases/create-commission-split.use-case';
import { CreateCommissionRuleDto } from '../api/dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from '../api/dto/update-commission-rule.dto';
import { QueryCommissionRulesDto } from '../api/dto/query-commission-rules.dto';
import {
  QueryCommissionSplitsDto,
  QueryCommissionSplitsSummaryDto,
} from '../api/dto/query-commission-splits.dto';
import {
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '../infrastructure/entities/commission-rule.entity';
import { CommissionRule } from '../infrastructure/entities/commission-rule.entity';
import { CommissionSplit } from '../infrastructure/entities/commission-split.entity';

export {
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
  CommissionSplitInput,
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
  QueryCommissionRulesDto,
  QueryCommissionSplitsDto,
  QueryCommissionSplitsSummaryDto,
  CommissionSplitsSummary,
};

@Injectable()
export class CommissionsFacade {
  constructor(
    private readonly createCommissionRuleUseCase: CreateCommissionRuleUseCase,
    private readonly updateCommissionRuleUseCase: UpdateCommissionRuleUseCase,
    private readonly listCommissionRulesUseCase: ListCommissionRulesUseCase,
    private readonly getCommissionSplitsUseCase: GetCommissionSplitsUseCase,
    private readonly resolveCommissionUseCase: ResolveCommissionUseCase,
    private readonly createCommissionSplitUseCase: CreateCommissionSplitUseCase,
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

  getCommissionSplits(query: QueryCommissionSplitsDto = {}): Promise<{
    data: CommissionSplit[];
    meta: { total: number; limit: number; offset: number };
  }> {
    return this.getCommissionSplitsUseCase.execute(query);
  }

  getCommissionSplitsSummary(
    query: QueryCommissionSplitsSummaryDto = {},
  ): Promise<CommissionSplitsSummary> {
    return this.getCommissionSplitsUseCase.summary(query);
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

  createCommissionSplit(
    input: CommissionSplitInput,
    qr?: QueryRunner,
  ): Promise<CommissionSplit> {
    return this.createCommissionSplitUseCase.execute(input, qr);
  }
}
