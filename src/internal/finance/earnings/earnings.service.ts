import { Injectable } from '@nestjs/common';
import type { DrizzleTx } from '@/core/drizzledb/drizzle.types';
import type { EarningPolicyRow } from '@/core/drizzledb/schema';
import { CalculateEarningsUseCase } from './use-cases/calculate-earnings.use-case';
import {
  DistributeEarningsUseCase,
  type DistributeEarningsInput,
} from './use-cases/distribute-earnings.use-case';
import {
  GetEarningSplitsUseCase,
  type EarningsSummaryResult,
} from './use-cases/get-earning-splits.use-case';
import { ManageEarningPoliciesUseCase } from './use-cases/manage-earning-policies.use-case';
import {
  type CalculateEarningsInput,
  type CalculatedEarningsResult,
  QueryEarningSplitsDto,
  CreateEarningPolicyDto,
} from './dto';
import type { EarningSplitDomain } from './earnings.mapper';

@Injectable()
export class EarningsService {
  constructor(
    private readonly calculateUseCase: CalculateEarningsUseCase,
    private readonly distributeUseCase: DistributeEarningsUseCase,
    private readonly getSplitsUseCase: GetEarningSplitsUseCase,
    private readonly managePoliciesUseCase: ManageEarningPoliciesUseCase,
  ) {}

  /**
   * Pure calculation: Preview how a gross amount (call/chat/order/puja) will be split.
   */
  async calculateEarnings(
    input: CalculateEarningsInput,
  ): Promise<CalculatedEarningsResult> {
    return this.calculateUseCase.execute(input);
  }

  /**
   * Execution: Distribute earnings, persist EarningSplit, and enqueue ledger credits.
   */
  async distributeEarnings(
    input: DistributeEarningsInput,
    tx?: DrizzleTx,
  ): Promise<EarningSplitDomain> {
    return this.distributeUseCase.execute(input, tx);
  }

  /**
   * Queries and reports for admin and provider dashboards.
   */
  async getEarningSplits(filters: QueryEarningSplitsDto) {
    return this.getSplitsUseCase.execute(filters);
  }

  async getEarningsSummary(
    filters: QueryEarningSplitsDto,
  ): Promise<EarningsSummaryResult> {
    return this.getSplitsUseCase.summary(filters);
  }

  /**
   * Policy management.
   */
  async createPolicy(dto: CreateEarningPolicyDto): Promise<EarningPolicyRow> {
    return this.managePoliciesUseCase.createPolicy(dto);
  }

  async listPolicies(): Promise<EarningPolicyRow[]> {
    return this.managePoliciesUseCase.listPolicies();
  }
}

