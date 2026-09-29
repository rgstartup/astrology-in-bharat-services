import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { Idempotency } from './entities/idempotency.entity';
import { SystemSetting } from '../../admin/entities/system-setting.entity';
import { AgentModule } from '../../domains/agent/agent.module';
import { UsersModule } from '../../users/users.module';
import { AdminModule } from '../../admin/admin.module';
import { ProfileModule as ExpertProfileModule } from '../../domains/expert/profile/profile.module';
import { AccountModule } from '../../domains/client/account/account.module';
import { MerchantModule } from '../../domains/merchant/merchant.module';
import { WalletController } from './controllers/wallet.controller';
import { PayoutWebhookController } from './controllers/payout-webhook.controller';
import { WalletService } from './wallet.service';
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
import { GetMerchantTransactionsUseCase } from './use-cases/get-merchant-transactions.use-case';
import { GetTotalEarningsUseCase } from './use-cases/get-total-earnings.use-case';
import { GetGlobalEarningsUseCase } from './use-cases/get-global-earnings.use-case';
import { GetWithdrawalsStatusUseCase } from './use-cases/get-withdrawals-status.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { GetPendingWithdrawalsUseCase } from './use-cases/get-pending-withdrawals.use-case';
import { UpdateWithdrawalStatusUseCase } from './use-cases/update-withdrawal-status.use-case';
import { GetAdminWithdrawalStatsUseCase } from './use-cases/get-admin-withdrawal-stats.use-case';
import { GetAdminCommissionUseCase } from './use-cases/get-admin-commission.use-case';
import { GetAdminRevenueTrendUseCase } from './use-cases/get-admin-revenue-trend.use-case';
import { GetWithdrawalsUseCase } from './use-cases/get-withdrawals.use-case';
import { ReconcileWalletUseCase } from './use-cases/reconcile-wallet.use-case';
import { StuckWithdrawalJob } from './use-cases/stuck-withdrawal-job.use-case';
import { RazorpayPayoutService } from './gateways/razorpay-payout.service';
import { NotificationModule } from '../../notification/notification.module';
import { BankAccountsModule } from '../../domains/expert/bank-accounts/bank-accounts.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { GeneralLedgerEntry } from '../ledger/entities/general-ledger-entry.entity';
import { QueueModule } from '../../../core/queue/queue.module';
import WalletRepository from './repositories/wallet.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      Transaction,
      Withdrawal,
      Idempotency,
      SystemSetting,
      GeneralLedgerEntry,
    ]),
    NotificationModule,
    BankAccountsModule,
    UsersModule,
    forwardRef(() => AdminModule),
    forwardRef(() => ExpertProfileModule),
    forwardRef(() => AccountModule),
    forwardRef(() => MerchantModule),
    forwardRef(() => AgentModule),
    CommissionsModule,
    QueueModule,
  ],
  providers: [
    WalletService,
    GetWalletUseCase,
    GetBalanceUseCase,
    ValidateBalanceUseCase,
    TopUpUseCase,
    CreditUseCase,
    DebitUseCase,
    ReserveBalanceUseCase,
    DeductFromReservedUseCase,
    ReleaseReservedUseCase,
    GetTransactionsUseCase,
    GetMerchantTransactionsUseCase,
    GetTotalEarningsUseCase,
    GetGlobalEarningsUseCase,
    GetWithdrawalsStatusUseCase,
    RequestWithdrawalUseCase,
    GetPendingWithdrawalsUseCase,
    UpdateWithdrawalStatusUseCase,
    GetAdminWithdrawalStatsUseCase,
    GetAdminCommissionUseCase,
    GetAdminRevenueTrendUseCase,
    GetWithdrawalsUseCase,
    ReconcileWalletUseCase,
    StuckWithdrawalJob,
    RazorpayPayoutService,
    WalletRepository,
  ],
  controllers: [WalletController, PayoutWebhookController],
  exports: [WalletService],
})
export class WalletModule {}
