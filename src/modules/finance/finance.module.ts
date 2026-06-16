import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { CommissionsModule } from './commissions/commissions.module';
import { GeneralLedgerModule } from './general-ledger/general-ledger.module';

@Module({
  imports: [WalletModule, CommissionsModule, GeneralLedgerModule],
  exports: [WalletModule, CommissionsModule, GeneralLedgerModule],
})
export class FinanceModule {}
