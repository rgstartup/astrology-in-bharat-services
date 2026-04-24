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
    ) { }

    async getStats(userId: number, period: string, startDate?: string, endDate?: string) {
        return this.getEarningsStatsUseCase.execute(userId, period, startDate, endDate);
    }

    async getWalletBalance(userId: number) {
        return this.getWalletBalanceUseCase.execute(userId);
    }

    async getTransactions(userId: number, limit: number, offset: number, type: string) {
        return this.getWalletTransactionsUseCase.execute(userId, limit, offset, type);
    }

    async requestWithdrawal(userId: number, amount: number, bank_account_id: number, idempotencyKey?: string, securityMetadata?: { ip?: string; ua?: string }) {
        return this.requestWithdrawalUseCase.execute(userId, amount, bank_account_id, idempotencyKey, securityMetadata);
    }
}
