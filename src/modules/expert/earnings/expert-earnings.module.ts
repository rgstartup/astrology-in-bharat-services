import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertEarningsController } from './api/controllers/expert-earnings.controller';
import { ExpertWalletController } from './api/controllers/expert-wallet.controller';
import { ExpertEarningsFacade } from './application/expert-earnings.facade';
import { GetEarningsStatsUseCase } from './application/use-cases/get-earnings-stats.use-case';
import { GetWalletBalanceUseCase } from './application/use-cases/get-wallet-balance.use-case';
import { GetWalletTransactionsUseCase } from './application/use-cases/get-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './application/use-cases/request-withdrawal.use-case';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';

import { ConsultationModule } from '@/modules/consultation/consultation.module';
import { OrderModule } from '@/modules/commerce/order/order.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileExpert]),
    WalletModule,
    forwardRef(() => ConsultationModule),
    forwardRef(() => OrderModule),
    forwardRef(() => PujaAppointmentModule),
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
export class ExpertEarningsModule {}
