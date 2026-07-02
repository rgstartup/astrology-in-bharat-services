import { Module, forwardRef } from '@nestjs/common';
import { ExpertDashboardController } from './api/controllers/expert-dashboard.controller';
import { GetDashboardStatsUseCase } from './application/use-cases/get-dashboard-stats.use-case';
import { ExpertDashboardFacade } from './application/expert-dashboard.facade';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ConsultationModule } from '@/modules/consultation/consultation.module';

@Module({
  imports: [
    forwardRef(() => ConsultationModule),
    WalletModule,
  ],
  controllers: [ExpertDashboardController],
  providers: [ExpertDashboardFacade, GetDashboardStatsUseCase],
})
export class ExpertDashboardModule {}
