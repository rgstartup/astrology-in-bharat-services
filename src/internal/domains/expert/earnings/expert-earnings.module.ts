import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertEarningsController } from './controllers/expert-earnings.controller';
import { ExpertWalletController } from './controllers/expert-wallet.controller';
import { ExpertEarningsService } from './expert-earnings.service';
import { GetEarningsStatsUseCase } from './use-cases/get-earnings-stats.use-case';
import { GetWalletBalanceUseCase } from './use-cases/get-wallet-balance.use-case';
import { GetWalletTransactionsUseCase } from './use-cases/get-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { ExpertAccount } from '../account/entities/account.entity';
import { ExpertAuthModule } from '../auth/auth.module';
import { WalletModule } from '../../../finance/wallet/wallet.module';

import { ConsultationModule } from '../../../consultation/consultation.module';
import { OrderModule } from '../../../commerce/order/order.module';
import { PujaAppointmentModule } from '../../../puja-appointment/puja-appointment.module';

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
    ExpertEarningsService,
    GetEarningsStatsUseCase,
    GetWalletBalanceUseCase,
    GetWalletTransactionsUseCase,
    RequestWithdrawalUseCase,
  ],
  exports: [ExpertEarningsService],
})
export class ExpertEarningsModule {}
