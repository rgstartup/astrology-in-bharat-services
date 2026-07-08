import { Injectable } from '@nestjs/common';
import { GetEarningsStatsUseCase } from './use-cases/get-earnings-stats.use-case';
import { GetWalletBalanceUseCase } from './use-cases/get-wallet-balance.use-case';
import { GetWalletTransactionsUseCase } from './use-cases/get-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { GetExpertTransactionsDto } from '../api/dto/get-expert-transactions.dto';
import { RequestExpertWithdrawalDto } from '../api/dto/request-expert-withdrawal.dto';
import { GetExpertEarningsStatsDto } from '../api/dto/get-expert-earnings-stats.dto';

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
    dto: GetExpertEarningsStatsDto,
  ) {
    return this.getEarningsStatsUseCase.execute(expertProfileId, dto);
  }

  async getWalletBalance(expertProfileId: string) {
    return this.getWalletBalanceUseCase.execute(expertProfileId);
  }

  async getTransactions(
    expertProfileId: string,
    dto: GetExpertTransactionsDto,
  ) {
    return this.getWalletTransactionsUseCase.execute(expertProfileId, dto);
  }

  async requestWithdrawal(
    expertProfileId: string,
    dto: RequestExpertWithdrawalDto,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    return this.requestWithdrawalUseCase.execute(
      expertProfileId,
      dto,
      idempotencyKey,
      securityMetadata,
    );
  }
}
