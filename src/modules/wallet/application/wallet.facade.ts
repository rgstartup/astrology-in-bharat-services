import { Injectable } from '@nestjs/common';
import { GetWalletUseCase } from './use-cases/get-wallet.use-case';
import { GetBalanceUseCase } from './use-cases/get-balance.use-case';
import { ValidateBalanceUseCase } from './use-cases/validate-balance.use-case';
import { TopUpUseCase } from './use-cases/top-up.use-case';
import { CreditUseCase } from './use-cases/credit.use-case';
import { DebitUseCase } from './use-cases/debit.use-case';
import { ReserveBalanceUseCase } from './use-cases/reserve-balance.use-case';
import { DeductFromReservedUseCase } from './use-cases/deduct-from-reserved.use-case';
import { ReleaseReservedUseCase } from './use-cases/release-reserved.use-case';
import { GetTransactionsUseCase } from './use-cases/get-transactions.use-case';
import { GetTotalEarningsUseCase } from './use-cases/get-total-earnings.use-case';
import { GetGlobalEarningsUseCase } from './use-cases/get-global-earnings.use-case';
import { GetAdminCommissionUseCase } from './use-cases/get-admin-commission.use-case';
import { GetWithdrawalsStatusUseCase } from './use-cases/get-withdrawals-status.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { GetPendingWithdrawalsUseCase } from './use-cases/get-pending-withdrawals.use-case';
import { UpdateWithdrawalStatusUseCase } from './use-cases/update-withdrawal-status.use-case';
import { GetAdminWithdrawalStatsUseCase } from './use-cases/get-admin-withdrawal-stats.use-case';
import { TransactionPurpose } from '../infrastructure/persistence/entities/transaction.entity';
import { WithdrawalStatus } from '../infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class WalletFacade {
  constructor(
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly getBalanceUseCase: GetBalanceUseCase,
    private readonly validateBalanceUseCase: ValidateBalanceUseCase,
    private readonly topUpUseCase: TopUpUseCase,
    private readonly creditUseCase: CreditUseCase,
    private readonly debitUseCase: DebitUseCase,
    private readonly reserveBalanceUseCase: ReserveBalanceUseCase,
    private readonly deductFromReservedUseCase: DeductFromReservedUseCase,
    private readonly releaseReservedUseCase: ReleaseReservedUseCase,
    private readonly getTransactionsUseCase: GetTransactionsUseCase,
    private readonly getTotalEarningsUseCase: GetTotalEarningsUseCase,
    private readonly getGlobalEarningsUseCase: GetGlobalEarningsUseCase,
    private readonly getWithdrawalsStatusUseCase: GetWithdrawalsStatusUseCase,
    private readonly requestWithdrawalUseCase: RequestWithdrawalUseCase,
    private readonly getPendingWithdrawalsUseCase: GetPendingWithdrawalsUseCase,
    private readonly updateWithdrawalStatusUseCase: UpdateWithdrawalStatusUseCase,
    private readonly getAdminWithdrawalStatsUseCase: GetAdminWithdrawalStatsUseCase,
    private readonly getAdminCommissionUseCase: GetAdminCommissionUseCase,
  ) { }

  async getWallet(userId: number) {
    return this.getWalletUseCase.execute(userId);
  }

  async getBalance(userId: number) {
    return this.getBalanceUseCase.execute(userId);
  }

  async validateBalance(userId: number, minAmount: number) {
    return this.validateBalanceUseCase.execute(userId, minAmount);
  }

  async topUp(userId: number, amount: number, referenceId?: string) {
    return this.topUpUseCase.execute(userId, amount, referenceId);
  }

  async credit(userId: number, amount: number, purpose: TransactionPurpose, referenceId?: string, externalQueryRunner?: any) {
    return this.creditUseCase.execute(userId, amount, purpose, referenceId, externalQueryRunner);
  }

  async debit(userId: number, amount: number, purpose: TransactionPurpose, referenceId?: string, externalQueryRunner?: any) {
    return this.debitUseCase.execute(userId, amount, purpose, referenceId, externalQueryRunner);
  }

  async reserveBalance(userId: number, amount: number, referenceId: string) {
    return this.reserveBalanceUseCase.execute(userId, amount, referenceId);
  }

  async deductFromReserved(userId: number, amount: number, referenceId: string) {
    return this.deductFromReservedUseCase.execute(userId, amount, referenceId);
  }

  async releaseReserved(userId: number, amount: number, referenceId: string) {
    return this.releaseReservedUseCase.execute(userId, amount, referenceId);
  }

  async getTransactions(userId: number, page?: number, limit?: number, type?: string, purpose?: string) {
    return this.getTransactionsUseCase.execute(userId, page, limit, type, purpose);
  }

  async getTotalEarnings(userId: number, options: { startDate?: Date; endDate?: Date } = {}) {
    return this.getTotalEarningsUseCase.execute(userId, options);
  }

  async getGlobalEarnings() {
    return this.getGlobalEarningsUseCase.execute();
  }

  async getWithdrawalsStatus(userId: number) {
    return this.getWithdrawalsStatusUseCase.execute(userId);
  }

  async requestWithdrawal(userId: number, amount: number, bank_account_id?: number) {
    return this.requestWithdrawalUseCase.execute(userId, amount, bank_account_id);
  }

  async getPendingWithdrawals(page?: number, limit?: number) {
    return this.getPendingWithdrawalsUseCase.execute(page, limit);
  }

  async updateWithdrawalStatus(id: number, status: WithdrawalStatus, adminId: number, remark?: string) {
    return this.updateWithdrawalStatusUseCase.execute(id, status, adminId, remark);
  }

  async getAdminWithdrawalStats() {
    return this.getAdminWithdrawalStatsUseCase.execute();
  }

  async getAdminCommission() {
    return this.getAdminCommissionUseCase.execute();
  }
}
