import { Module } from '@nestjs/common';
import { WalletModule } from './wallet/wallet.module';
import { CommissionsModule } from './commissions/commissions.module';

@Module({
  imports: [WalletModule, CommissionsModule],
  exports: [WalletModule, CommissionsModule],
})
export class FinanceModule {}
