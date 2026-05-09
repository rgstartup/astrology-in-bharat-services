import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertEarningsController } from './api/controllers/expert-earnings.controller';
import { ExpertWalletController } from './api/controllers/expert-wallet.controller';
import { ExpertEarningsFacade } from './application/expert-earnings.facade';
import { GetEarningsStatsUseCase } from './application/use-cases/get-earnings-stats.use-case';
import { GetWalletBalanceUseCase } from './application/use-cases/get-wallet-balance.use-case';
import { GetWalletTransactionsUseCase } from './application/use-cases/get-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './application/use-cases/request-withdrawal.use-case';
import { ChatSession } from '@/modules/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/call/infrastructure/entities/call-session.entity';
import { Order } from '@/modules/order/infrastructure/entities/order.entity';
import { OrderItem } from '@/modules/order/infrastructure/entities/order-item.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { PujaAppointment } from '@/modules/puja-appointment/infrastructure/entities/puja-appointment.entity';
import { Review } from '@/modules/reviews/infrastructure/entities/review.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChatSession,
            CallSession,
            Order,
            OrderItem,
            ProfileExpert,
            PujaAppointment,
            Review,
        ]),
        WalletModule,
    ],
    controllers: [ExpertEarningsController, ExpertWalletController],
    providers: [
        ExpertEarningsFacade,
        GetEarningsStatsUseCase,
        GetWalletBalanceUseCase,
        GetWalletTransactionsUseCase,
        RequestWithdrawalUseCase,
    ],
    exports: [ExpertEarningsFacade],
})
export class ExpertEarningsModule { }
