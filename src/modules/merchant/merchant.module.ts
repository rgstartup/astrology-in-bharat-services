import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { MerchantDashboardModule } from './dashboard/merchant-dashboard.module';

@Module({
  imports: [ProfileModule, MerchantDashboardModule],
  exports: [ProfileModule, MerchantDashboardModule],
})
export class MerchantModule {}
