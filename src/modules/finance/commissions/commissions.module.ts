import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionRule } from './entities/commission-rule.entity';
import { CommissionTier } from './entities/commission-tier.entity';
import { CommissionSplit } from './entities/commission-split.entity';
import { SystemSetting } from '@/modules/admin/entities/system-setting.entity';
import { GeneralLedgerEntry } from '@/modules/finance/general-ledger/entities/general-ledger-entry.entity';
import { ResolveCommissionUseCase } from './use-cases/resolve-commission.use-case';
import { CreateCommissionSplitUseCase } from './use-cases/create-commission-split.use-case';
import { CreateCommissionRuleUseCase } from './use-cases/create-commission-rule.use-case';
import { ListCommissionRulesUseCase } from './use-cases/list-commission-rules.use-case';
import { UpdateCommissionRuleUseCase } from './use-cases/update-commission-rule.use-case';
import { GetCommissionSplitsUseCase } from './use-cases/get-commission-splits.use-case';
import { CommissionsFacade } from './commissions.facade';
import { CommissionRulesController } from './controllers/commission-rules.controller';
import { CommissionSplitsController } from './controllers/commission-splits.controller';

import { QueueModule } from '@/core/queue/queue.module';

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
