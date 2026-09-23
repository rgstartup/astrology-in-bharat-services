import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { GeneralLedgerModule } from './ledger/general-ledger.module';
import { EarningsModule } from './earnings/earnings.module';

@Module({
  imports: [WalletModule, GeneralLedgerModule, EarningsModule],
  exports: [WalletModule, GeneralLedgerModule, EarningsModule],
})
export class FinanceModule {}

