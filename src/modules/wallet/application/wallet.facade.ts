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
import { GetWithdrawalsUseCase } from './use-cases/get-withdrawals.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { GetPendingWithdrawalsUseCase } from './use-cases/get-pending-withdrawals.use-case';
import { UpdateWithdrawalStatusUseCase } from './use-cases/update-withdrawal-status.use-case';
import { GetAdminWithdrawalStatsUseCase } from './use-cases/get-admin-withdrawal-stats.use-case';
import { TransactionPurpose } from '../infrastructure/entities/transaction.entity';
import { WithdrawalStatus } from '../infrastructure/entities/withdrawal.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class WalletFacade {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
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
    private readonly getWithdrawalsUseCase: GetWithdrawalsUseCase,
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

  async topUp(userId: number, amount: number, referenceId?: string, externalQueryRunner?: any) {
    return this.topUpUseCase.execute(userId, amount, referenceId, externalQueryRunner);
  }

  async credit(userId: number, amount: number, purpose: TransactionPurpose, referenceId?: string, externalQueryRunner?: any) {
    return this.creditUseCase.execute(userId, amount, purpose, referenceId, externalQueryRunner);
  }

  async debit(userId: number, amount: number, purpose: TransactionPurpose, referenceId?: string, externalQueryRunner?: any, allowNegative: boolean = false) {
    return this.debitUseCase.execute(userId, amount, purpose, referenceId, externalQueryRunner, allowNegative);
  }

  async reserveBalance(userId: number, amount: number, referenceId: string, externalQueryRunner?: any) {
    return this.reserveBalanceUseCase.execute(userId, amount, referenceId, externalQueryRunner);
  }

  async deductFromReserved(userId: number, amount: number, referenceId: string, externalQueryRunner?: any) {
    return this.deductFromReservedUseCase.execute(userId, amount, referenceId, externalQueryRunner);
  }

  async releaseReserved(userId: number, amount: number, referenceId: string, externalQueryRunner?: any) {
    return this.releaseReservedUseCase.execute(userId, amount, referenceId, externalQueryRunner);
  }

  async getTransactions(userId: number, limit?: number, offset?: number, type?: string, purpose?: string) {
    return this.getTransactionsUseCase.execute(userId, limit, offset, type, purpose);
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

  async getWithdrawals(userId: number, limit?: number, offset?: number) {
    return this.getWithdrawalsUseCase.execute(userId, limit, offset);
  }

  async requestWithdrawal(userId: number, amount: number, bank_account_id?: string | number, idempotencyKey?: string, securityMetadata?: { ip?: string; ua?: string }) {
    return this.requestWithdrawalUseCase.execute(userId, amount, bank_account_id, idempotencyKey, securityMetadata);
  }

  async getPendingWithdrawals(limit?: number, offset?: number, status?: WithdrawalStatus, userRole?: RoleEnum) {
    return this.getPendingWithdrawalsUseCase.execute(limit, offset, status, userRole);
  }


  async updateWithdrawalStatus(id: number, status: WithdrawalStatus, adminId: number, remark?: string) {
    return this.updateWithdrawalStatusUseCase.execute(id, status, adminId, remark);
  }

  async getAdminWithdrawalStats(userRole?: RoleEnum) {
    return this.getAdminWithdrawalStatsUseCase.execute(userRole);
  }


  async getAdminCommission() {
    return this.getAdminCommissionUseCase.execute();
  }

  async getAdminCommissionFromSetting(key: string): Promise<number> {
    try {
      let setting = await this.settingRepo.findOne({ where: { key } });
      
      // Fallback for common spelling inconsistency (COMMISION vs COMMISSION)
      if (!setting) {
        const altKey = key.includes('COMMISSION') 
          ? key.replace('COMMISSION', 'COMMISION') 
          : key.replace('COMMISION', 'COMMISSION');
        setting = await this.settingRepo.findOne({ where: { key: altKey } });
      }

      if (setting && setting.value) {
        return parseFloat(setting.value);
      }
    } catch (e) {
      console.error(`[WalletFacade] Failed to fetch setting ${key}:`, e);
    }
    return 3; // Default 3% fallback
  }
}
