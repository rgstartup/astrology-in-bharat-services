import { Module, forwardRef } from '@nestjs/common';
import { ExpertDashboardController } from './controllers/expert-dashboard.controller';
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case';
import { ExpertDashboardFacade } from './expert-dashboard.facade';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { ConsultationModule } from '@/modules/consultation/consultation.module';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => ConsultationModule),
    WalletModule,
    ExpertAuthModule,
  ],
  controllers: [ExpertDashboardController],
  providers: [ExpertDashboardFacade, GetDashboardStatsUseCase],
})
export class ExpertDashboardModule {}
