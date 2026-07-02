import { Injectable } from '@nestjs/common';
import { GetEarningsStatsUseCase } from './use-cases/get-earnings-stats.use-case';
import { GetWalletBalanceUseCase } from './use-cases/get-wallet-balance.use-case';
import { GetWalletTransactionsUseCase } from './use-cases/get-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';

@Injectable()
export class ExpertEarningsFacade {
  constructor(
    private readonly getEarningsStatsUseCase: GetEarningsStatsUseCase,
    private readonly getWalletBalanceUseCase: GetWalletBalanceUseCase,
    private readonly getWalletTransactionsUseCase: GetWalletTransactionsUseCase,
    private readonly requestWithdrawalUseCase: RequestWithdrawalUseCase,
  ) {}

  async getStats(
    expertProfileId: string,
    period: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.getEarningsStatsUseCase.execute(
      expertProfileId,
      period,
      startDate,
      endDate,
    );
  }

  async getWalletBalance(expertProfileId: string) {
    return this.getWalletBalanceUseCase.execute(expertProfileId);
  }

  async getTransactions(
    expertProfileId: string,
    limit: number,
    offset: number,
    type: string,
  ) {
    return this.getWalletTransactionsUseCase.execute(
      expertProfileId,
      limit,
      offset,
      type,
    );
  }

  async requestWithdrawal(
    expertProfileId: string,
    amount: number,
    bank_account_id: string | number,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    return this.requestWithdrawalUseCase.execute(
      expertProfileId,
      amount,
      bank_account_id,
      idempotencyKey,
      securityMetadata,
    );
  }
}
