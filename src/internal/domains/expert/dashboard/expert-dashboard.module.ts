import { Module, forwardRef } from '@nestjs/common';
import { ExpertDashboardController } from './controllers/expert-dashboard.controller';
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case';
import { ExpertDashboardService } from './expert-dashboard.service';
import { WalletModule } from '@/internal/finance/wallet/wallet.module';
import { ConsultationModule } from '@/internal/consultation/consultation.module';
import { ExpertAuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => ConsultationModule),
    WalletModule,
    ExpertAuthModule,
  ],
  controllers: [ExpertDashboardController],
  providers: [ExpertDashboardService, GetDashboardStatsUseCase],
})
export class ExpertDashboardModule {}
