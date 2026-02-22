import { Module } from '@nestjs/common';
import { ExpertDashboardController } from './api/controllers/expert-dashboard.controller';
import { GetDashboardStatsUseCase } from './application/use-cases/get-dashboard-stats.use-case';
import { ExpertDashboardFacade } from './application/expert-dashboard.facade';
import { ChatModule } from '@/modules/chat/chat.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ProfileModule } from '@/modules/expert/profile/profile.module';

@Module({
    imports: [
        ChatModule,
        WalletModule,
        ProfileModule,
    ],
    controllers: [ExpertDashboardController],
    providers: [
        ExpertDashboardFacade,
        GetDashboardStatsUseCase,
    ],
})
export class ExpertDashboardModule { }
