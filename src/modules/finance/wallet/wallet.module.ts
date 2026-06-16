import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './infrastructure/entities/wallet.entity';
import { Transaction } from './infrastructure/entities/transaction.entity';
import { Withdrawal } from './infrastructure/entities/withdrawal.entity';
import { Idempotency } from './infrastructure/entities/idempotency.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { AgentModule } from '@/modules/agent/agent.module';
import { UsersModule } from '@/modules/users/users.module';
import { AdminModule } from '@/modules/admin/admin.module';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { ProfileModule as ClientProfileModule } from '@/modules/client/profile/profile.module';
import { MerchantModule } from '@/modules/merchant/merchant.module';
import { WalletController } from './api/controllers/wallet.controller';
import { PayoutWebhookController } from './api/controllers/payout-webhook.controller';
import { WalletFacade } from './application/wallet.facade';
import { GetWalletUseCase } from './application/use-cases/get-wallet.use-case';
import { GetBalanceUseCase } from './application/use-cases/get-balance.use-case';
import { ValidateBalanceUseCase } from './application/use-cases/validate-balance.use-case';
import { TopUpUseCase } from './application/use-cases/top-up.use-case';
import { CreditUseCase } from './application/use-cases/credit.use-case';
import { DebitUseCase } from './application/use-cases/debit.use-case';
import { ReserveBalanceUseCase } from './application/use-cases/reserve-balance.use-case';
import { DeductFromReservedUseCase } from './application/use-cases/deduct-from-reserved.use-case';
import { ReleaseReservedUseCase } from './application/use-cases/release-reserved.use-case';
import { GetTransactionsUseCase } from './application/use-cases/get-transactions.use-case';
import { GetMerchantTransactionsUseCase } from './application/use-cases/get-merchant-transactions.use-case';
import { GetTotalEarningsUseCase } from './application/use-cases/get-total-earnings.use-case';
import { GetGlobalEarningsUseCase } from './application/use-cases/get-global-earnings.use-case';
import { GetWithdrawalsStatusUseCase } from './application/use-cases/get-withdrawals-status.use-case';
import { RequestWithdrawalUseCase } from './application/use-cases/request-withdrawal.use-case';
import { GetPendingWithdrawalsUseCase } from './application/use-cases/get-pending-withdrawals.use-case';
import { UpdateWithdrawalStatusUseCase } from './application/use-cases/update-withdrawal-status.use-case';
import { GetAdminWithdrawalStatsUseCase } from './application/use-cases/get-admin-withdrawal-stats.use-case';
import { GetAdminCommissionUseCase } from './application/use-cases/get-admin-commission.use-case';
import { GetAdminRevenueTrendUseCase } from './application/use-cases/get-admin-revenue-trend.use-case';
import { GetWithdrawalsUseCase } from './application/use-cases/get-withdrawals.use-case';
import { ReconcileWalletUseCase } from './application/use-cases/reconcile-wallet.use-case';
import { StuckWithdrawalJob } from './application/use-cases/stuck-withdrawal-job.use-case';
import { RazorpayPayoutService } from './infrastructure/gateways/razorpay-payout.service';
import { NotificationModule } from '@/modules/notification/notification.module';
import { BankAccountsModule } from '@/modules/expert/bank-accounts/bank-accounts.module';
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';
import { GeneralLedgerEntry } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';

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
    forwardRef(() => ClientProfileModule),
    forwardRef(() => MerchantModule),
    forwardRef(() => AgentModule),
    CommissionsModule,
  ],
  providers: [
    WalletFacade,
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
  ],
  controllers: [WalletController, PayoutWebhookController],
  exports: [WalletFacade],
})
export class WalletModule {}
