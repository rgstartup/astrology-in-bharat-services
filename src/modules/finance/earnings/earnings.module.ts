import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EarningPolicy, EarningTier, EarningSplit } from './entities';
import { CalculateEarningsUseCase } from './use-cases/calculate-earnings.use-case';
import { DistributeEarningsUseCase } from './use-cases/distribute-earnings.use-case';
import { GetEarningSplitsUseCase } from './use-cases/get-earning-splits.use-case';
import { ManageEarningPoliciesUseCase } from './use-cases/manage-earning-policies.use-case';
import { EarningsFacade } from './earnings.facade';
import { EarningsController } from './controllers/earnings.controller';
import { QueueModule } from '@/core/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EarningPolicy, EarningTier, EarningSplit]),
    QueueModule,
  ],
  controllers: [EarningsController],
  providers: [
    CalculateEarningsUseCase,
    DistributeEarningsUseCase,
    GetEarningSplitsUseCase,
    ManageEarningPoliciesUseCase,
    EarningsFacade,
  ],
  exports: [EarningsFacade, TypeOrmModule],
})
export class EarningsModule {}

