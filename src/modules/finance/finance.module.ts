import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { CommissionsModule } from './commissions/commissions.module';
import { GeneralLedgerModule } from './ledger/general-ledger.module';
import { PlatformEarningsModule } from './platform-earnings/platform-earnings.module';

@Module({
  imports: [
    WalletModule,
    CommissionsModule,
    GeneralLedgerModule,
    PlatformEarningsModule,
  ],
  exports: [
    WalletModule,
    CommissionsModule,
    GeneralLedgerModule,
    PlatformEarningsModule,
  ],
})
export class FinanceModule {}

