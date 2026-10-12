import { Module } from '@nestjs/common';
import { CalculateEarningsUseCase } from './use-cases/calculate-earnings.use-case';
import { DistributeEarningsUseCase } from './use-cases/distribute-earnings.use-case';
import { GetEarningSplitsUseCase } from './use-cases/get-earning-splits.use-case';
import { ManageEarningPoliciesUseCase } from './use-cases/manage-earning-policies.use-case';
import { EarningsService } from './earnings.service';
import { EarningsController } from './controllers/earnings.controller';
import { QueueModule } from '../../../core/queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [EarningsController],
  providers: [
    CalculateEarningsUseCase,
    DistributeEarningsUseCase,
    GetEarningSplitsUseCase,
    ManageEarningPoliciesUseCase,
    EarningsService,
  ],
  exports: [EarningsService],
})
export class EarningsModule {}

