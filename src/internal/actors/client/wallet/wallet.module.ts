import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientWallet } from './entities/client-wallet.entity';
import { ClientTransaction } from './entities/client-transaction.entity';
import { ClientWalletRecharge } from './entities/client-wallet-recharge.entity';
import { ClientAccount } from '../account/entities/account.entity';
import { NotificationModule } from '@/internal/notification/notification.module';
import { QueueModule } from '@/core/queue/queue.module';
import { PaymentGatewayModule as ExternalPaymentGatewayModule } from '@/external/payment/payment-gateway.module';
import { PaymentOrder } from '@/internal/finance/payments/entities/payment-order.entity';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { PaymentsModule as FinancePaymentsModule } from '@/internal/finance/payments/payments.module';
import { ClientPaymentsModule } from '@/internal/actors/client/payments/payments.module';
import { ClientWalletService } from './wallet.service';
import { ClientWalletController } from './controllers/wallet.controller';
import { GetClientWalletUseCase } from './use-cases/get-client-wallet.use-case';
import { ValidateClientBalanceUseCase } from './use-cases/validate-client-balance.use-case';
import { RechargeWalletUseCase } from './use-cases/recharge-wallet.use-case';
import { DebitClientWalletUseCase } from './use-cases/debit-client-wallet.use-case';
import { ReserveClientBalanceUseCase } from './use-cases/reserve-client-balance.use-case';
import { DeductFromClientReservedUseCase } from './use-cases/deduct-from-client-reserved.use-case';
import { ReleaseClientReservedUseCase } from './use-cases/release-client-reserved.use-case';
import { GetClientTransactionsUseCase } from './use-cases/get-client-transactions.use-case';
import { InitiateWalletRechargeUseCase } from './use-cases/initiate-wallet-recharge.use-case';
import { VerifyWalletRechargeUseCase } from './use-cases/verify-wallet-recharge.use-case';
import { WalletRechargeIntentHandler } from './handlers/wallet-recharge-intent.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientWallet,
      ClientTransaction,
      ClientWalletRecharge,
      ClientAccount,
      PaymentOrder,
      GatewayTransaction,
    ]),
    NotificationModule,
    QueueModule,
    ExternalPaymentGatewayModule,
    FinancePaymentsModule,
    ClientPaymentsModule,
  ],
  controllers: [ClientWalletController],
  providers: [
    ClientWalletService,
    GetClientWalletUseCase,
    ValidateClientBalanceUseCase,
    RechargeWalletUseCase,
    DebitClientWalletUseCase,
    ReserveClientBalanceUseCase,
    DeductFromClientReservedUseCase,
    ReleaseClientReservedUseCase,
    GetClientTransactionsUseCase,
    InitiateWalletRechargeUseCase,
    VerifyWalletRechargeUseCase,
    WalletRechargeIntentHandler,
  ],
  exports: [
    ClientWalletService,
    GetClientWalletUseCase,
    ValidateClientBalanceUseCase,
    RechargeWalletUseCase,
    DebitClientWalletUseCase,
    ReserveClientBalanceUseCase,
    DeductFromClientReservedUseCase,
    ReleaseClientReservedUseCase,
    GetClientTransactionsUseCase,
    InitiateWalletRechargeUseCase,
    VerifyWalletRechargeUseCase,
    TypeOrmModule,
  ],
})
export class WalletModule {}
