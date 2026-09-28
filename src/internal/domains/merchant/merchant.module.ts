import { Module } from '@nestjs/common';
import { MerchantDashboardModule } from './dashboard/merchant-dashboard.module';
import { MerchantAccountModule } from './account/account.module';
import { MerchantAuthModule } from './auth/auth.module';

@Module({
  imports: [
    MerchantAccountModule,
    MerchantAuthModule,
    MerchantDashboardModule,
  ],
  exports: [
    MerchantAccountModule,
    MerchantAuthModule,
    MerchantDashboardModule,
  ],
})
export class MerchantModule {}

