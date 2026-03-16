import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertEarningsController } from './api/controllers/expert-earnings.controller';
import { ExpertWalletController } from './api/controllers/expert-wallet.controller';
import { ExpertEarningsFacade } from './application/expert-earnings.facade';
import { GetEarningsStatsUseCase } from './application/use-cases/get-earnings-stats.use-case';
import { GetWalletBalanceUseCase } from './application/use-cases/get-wallet-balance.use-case';
import { GetWalletTransactionsUseCase } from './application/use-cases/get-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './application/use-cases/request-withdrawal.use-case';
import { ChatSession } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { CallSession } from '@/modules/call/infrastructure/persistence/entities/call-session.entity';
import { Order } from '@/modules/order/infrastructure/persistence/entities/order.entity';
import { OrderItem } from '@/modules/order/infrastructure/persistence/entities/order-item.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatSession, CallSession, Order, OrderItem, ProfileExpert]),
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
