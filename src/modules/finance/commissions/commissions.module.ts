import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionRule } from './infrastructure/entities/commission-rule.entity';
import { CommissionTier } from './infrastructure/entities/commission-tier.entity';
import { CommissionSplit } from './infrastructure/entities/commission-split.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { GeneralLedgerEntry } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { ResolveCommissionUseCase } from './application/use-cases/resolve-commission.use-case';
import { CreateCommissionSplitUseCase } from './application/use-cases/create-commission-split.use-case';
import { CreateCommissionRuleUseCase } from './application/use-cases/create-commission-rule.use-case';
import { ListCommissionRulesUseCase } from './application/use-cases/list-commission-rules.use-case';
import { UpdateCommissionRuleUseCase } from './application/use-cases/update-commission-rule.use-case';
import { GetCommissionSplitsUseCase } from './application/use-cases/get-commission-splits.use-case';
import { CommissionsFacade } from './application/commissions.facade';
import { CommissionRulesController } from './api/controllers/commission-rules.controller';
import { CommissionSplitsController } from './api/controllers/commission-splits.controller';

import { QueueModule } from '@/modules/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionRule,
      CommissionTier,
      CommissionSplit,
      SystemSetting,
      GeneralLedgerEntry,
    ]),
    QueueModule,
  ],
  providers: [
    ResolveCommissionUseCase,
    CreateCommissionSplitUseCase,
    CreateCommissionRuleUseCase,
    ListCommissionRulesUseCase,
    UpdateCommissionRuleUseCase,
    GetCommissionSplitsUseCase,
    CommissionsFacade,
  ],
  controllers: [CommissionRulesController, CommissionSplitsController],
  exports: [
    CommissionsFacade,
    ResolveCommissionUseCase,
    CreateCommissionSplitUseCase,
  ],
})
export class CommissionsModule {}
