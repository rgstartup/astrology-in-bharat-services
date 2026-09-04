import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertEarningsController } from './controllers/expert-earnings.controller';
import { ExpertWalletController } from './controllers/expert-wallet.controller';
import { ExpertEarningsFacade } from './expert-earnings.facade';
import { GetEarningsStatsUseCase } from './use-cases/get-earnings-stats.use-case';
import { GetWalletBalanceUseCase } from './use-cases/get-wallet-balance.use-case';
import { GetWalletTransactionsUseCase } from './use-cases/get-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { ExpertAuthModule } from '../auth/auth.module';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';

import { ConsultationModule } from '@/modules/consultation/consultation.module';
import { OrderModule } from '@/modules/client/commerce/order/order.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpertAccount]),
    ExpertAuthModule,
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
