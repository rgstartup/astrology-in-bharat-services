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
import { GetMerchantTransactionsUseCase } from './use-cases/get-merchant-transactions.use-case';
import { GetAdminRevenueTrendUseCase } from './use-cases/get-admin-revenue-trend.use-case';
import { ResolveCommissionUseCase } from '@/modules/finance/commissions/application/use-cases/resolve-commission.use-case';
import {
  CreateLedgerEntryUseCase,
  LedgerEntryInput,
} from '@/modules/finance/commissions/application/use-cases/create-ledger-entry.use-case';
import { TransactionPurpose } from '../infrastructure/entities/transaction.entity';
import { WalletKey } from '../infrastructure/entities/wallet.entity';
import { WithdrawalStatus } from '../infrastructure/entities/withdrawal.entity';
import {
  CommissionAppliesRole,
  CommissionEventType,
  CommissionType,
} from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export { CommissionEventType, CommissionType, CommissionAppliesRole };

export { WalletKey };

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
    private readonly getMerchantTransactionsUseCase: GetMerchantTransactionsUseCase,
    private readonly getAdminRevenueTrendUseCase: GetAdminRevenueTrendUseCase,
    private readonly resolveCommissionUseCase: ResolveCommissionUseCase,
    private readonly createLedgerEntryUseCase: CreateLedgerEntryUseCase,
  ) {}

  async getWallet(profileId: string, walletKey: WalletKey) {
    return this.getWalletUseCase.execute(profileId, walletKey);
  }

  async getBalance(profileId: string, walletKey: WalletKey) {
    return this.getBalanceUseCase.execute(profileId, walletKey);
  }

  async validateBalance(
    profileId: string,
    walletKey: WalletKey,
    minAmount: number,
  ) {
    return this.validateBalanceUseCase.execute(profileId, walletKey, minAmount);
  }

  async topUp(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    referenceId?: string,
    externalQueryRunner?: import('typeorm').QueryRunner,
  ) {
    return this.topUpUseCase.execute(
      profileId,
      walletKey,
      amount,
      referenceId,
      externalQueryRunner,
    );
  }

  async credit(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: import('typeorm').QueryRunner,
  ) {
    return this.creditUseCase.execute(
      profileId,
      walletKey,
      amount,
      purpose,
      referenceId,
      externalQueryRunner,
    );
  }

  async debit(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: import('typeorm').QueryRunner,
    allowNegative: boolean = false,
  ) {
    return this.debitUseCase.execute(
      profileId,
      walletKey,
      amount,
      purpose,
      referenceId,
      externalQueryRunner,
      allowNegative,
    );
  }

  async reserveBalance(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    referenceId: string,
    externalQueryRunner?: import('typeorm').QueryRunner,
  ) {
    return this.reserveBalanceUseCase.execute(
      profileId,
      walletKey,
      amount,
      referenceId,
      externalQueryRunner,
    );
  }

  async deductFromReserved(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    referenceId: string,
    externalQueryRunner?: import('typeorm').QueryRunner,
  ) {
    return this.deductFromReservedUseCase.execute(
      profileId,
      walletKey,
      amount,
      referenceId,
      externalQueryRunner,
    );
  }

  async releaseReserved(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    referenceId: string,
    externalQueryRunner?: import('typeorm').QueryRunner,
  ) {
    return this.releaseReservedUseCase.execute(
      profileId,
      walletKey,
      amount,
      referenceId,
      externalQueryRunner,
    );
  }

  async getTransactions(
    profileId: string,
    walletKey: WalletKey,
    limit?: string,
    offset?: string,
    type?: string,
    purpose?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.getTransactionsUseCase.execute(
      profileId,
      walletKey,
      limitNum,
      offsetNum,
      type,
      purpose,
    );
  }

  async getMerchantTransactions(
    merchantProfileId: string,
    options: { search?: string; page?: number; limit?: number },
  ) {
    return this.getMerchantTransactionsUseCase.execute(merchantProfileId, options);
  }

  async getTotalEarnings(
    profileId: string,
    walletKey: WalletKey,
    options: { startDate?: Date; endDate?: Date } = {},
  ) {
    return this.getTotalEarningsUseCase.execute(profileId, walletKey, options);
  }

  async getGlobalEarnings() {
    return this.getGlobalEarningsUseCase.execute();
  }

  async getWithdrawalsStatus(
    profileId: string | undefined,
    walletKey: WalletKey,
  ) {
    if (!profileId) throw new Error('profileId is required');
    return this.getWithdrawalsStatusUseCase.execute(profileId, walletKey);
  }

  async getWithdrawals(
    profileId: string,
    walletKey: WalletKey,
    limit?: number,
    offset?: number,
  ) {
    return this.getWithdrawalsUseCase.execute(
      profileId,
      walletKey,
      limit,
      offset,
    );
  }

  async requestWithdrawal(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    bank_account_id?: string | number,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    return this.requestWithdrawalUseCase.execute(
      profileId,
      walletKey,
      amount,
      bank_account_id,
      idempotencyKey,
      securityMetadata,
    );
  }

  async getPendingWithdrawals(
    limit?: number,
    offset?: number,
    status?: WithdrawalStatus,
    userRole?: RoleEnum,
  ) {
    return this.getPendingWithdrawalsUseCase.execute(
      limit,
      offset,
      status,
      userRole,
    );
  }

  async updateWithdrawalStatus(
    id: string,
    status: WithdrawalStatus,
    adminId: string,
    remark?: string,
  ) {
    return this.updateWithdrawalStatusUseCase.execute(
      id,
      status,
      adminId,
      remark,
    );
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
    return 3;
  }

  async getAdminRevenueTrend(days?: number) {
    return this.getAdminRevenueTrendUseCase.execute(days);
  }

  async resolveCommission(
    eventType: CommissionEventType,
    commissionType: CommissionType,
    profileId: string | null,
    role: CommissionAppliesRole,
    grossAmount: number,
  ) {
    return this.resolveCommissionUseCase.execute(
      eventType,
      commissionType,
      profileId,
      role,
      grossAmount,
    );
  }

  async createLedgerEntry(input: LedgerEntryInput, qr?: QueryRunner) {
    return this.createLedgerEntryUseCase.execute(input, qr);
  }
}
