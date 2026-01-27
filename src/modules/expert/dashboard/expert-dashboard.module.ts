import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertDashboardController } from './expert-dashboard.controller';
import { ExpertDashboardService } from './expert-dashboard.service';
import { ChatSession } from '@/modules/chat/entities/chat-session.entity';
import { Transaction } from '@/modules/wallet/entities/transaction.entity';
import { Wallet } from '@/modules/wallet/entities/wallet.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChatSession,
            Transaction,
            Wallet,
            ProfileExpert,
        ]),
    ],
    controllers: [ExpertDashboardController],
    providers: [ExpertDashboardService],
})
export class ExpertDashboardModule { }
