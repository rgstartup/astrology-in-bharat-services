import { Module, forwardRef } from '@nestjs/common';
import { ExpertDashboardController } from './controllers/expert-dashboard.controller';
import { GetDashboardStatsUseCase } from './use-cases/get-dashboard-stats.use-case';
import { ExpertDashboardService } from './expert-dashboard.service';
import { WalletModule } from '../../../finance/wallet/wallet.module';
import { ConsultationModule } from '../../../consultation/consultation.module';
import { ExpertAuthModule } from '../auth/auth.module';
import { ExpertReviewsModule } from '../consultation/reviews/expert-reviews.module';

@Module({
  imports: [
    forwardRef(() => ConsultationModule),
    WalletModule,
    ExpertAuthModule,
    ExpertReviewsModule,
  ],
  controllers: [ExpertDashboardController],
  providers: [ExpertDashboardService, GetDashboardStatsUseCase],
})
export class ExpertDashboardModule {}
