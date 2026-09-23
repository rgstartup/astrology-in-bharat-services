import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { CalculateEarningsUseCase } from './use-cases/calculate-earnings.use-case';
import {
  DistributeEarningsUseCase,
  DistributeEarningsInput,
} from './use-cases/distribute-earnings.use-case';
import {
  GetEarningSplitsUseCase,
  EarningsSummaryResult,
} from './use-cases/get-earning-splits.use-case';
import { ManageEarningPoliciesUseCase } from './use-cases/manage-earning-policies.use-case';
import {
  CalculateEarningsInput,
  CalculatedEarningsResult,
  QueryEarningSplitsDto,
  CreateEarningPolicyDto,
} from './dto';
import { EarningSplit, EarningPolicy } from './entities';

@Injectable()
export class EarningsFacade {
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
    qr?: QueryRunner,
  ): Promise<EarningSplit> {
    return this.distributeUseCase.execute(input, qr);
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
  async createPolicy(dto: CreateEarningPolicyDto): Promise<EarningPolicy> {
    return this.managePoliciesUseCase.createPolicy(dto);
  }

  async listPolicies(): Promise<EarningPolicy[]> {
    return this.managePoliciesUseCase.listPolicies();
  }
}
