import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { LedgerModule } from './ledger/ledger.module';
import { EarningsModule } from './earnings/earnings.module';
import { PaymentGatewayModule } from './payments/payments.module';

@Module({
  imports: [WalletModule, LedgerModule, EarningsModule, PaymentGatewayModule],
  exports: [WalletModule, LedgerModule, EarningsModule, PaymentGatewayModule],
})
export class FinanceModule {}
