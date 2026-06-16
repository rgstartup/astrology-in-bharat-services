import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionRule } from './infrastructure/entities/commission-rule.entity';
import { CommissionTier } from './infrastructure/entities/commission-tier.entity';
import { LedgerEntry } from './infrastructure/entities/ledger-entry.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { ResolveCommissionUseCase } from './application/use-cases/resolve-commission.use-case';
import { CreateLedgerEntryUseCase } from './application/use-cases/create-ledger-entry.use-case';
import { CreateCommissionRuleUseCase } from './application/use-cases/create-commission-rule.use-case';
import { ListCommissionRulesUseCase } from './application/use-cases/list-commission-rules.use-case';
import { UpdateCommissionRuleUseCase } from './application/use-cases/update-commission-rule.use-case';
import { GetLedgerUseCase } from './application/use-cases/get-ledger.use-case';
import { CommissionsFacade } from './application/commissions.facade';
import { CommissionRulesController } from './api/controllers/commission-rules.controller';
import { LedgerController } from './api/controllers/ledger.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionRule,
      CommissionTier,
      LedgerEntry,
      SystemSetting,
    ]),
  ],
  providers: [
    ResolveCommissionUseCase,
    CreateLedgerEntryUseCase,
    CreateCommissionRuleUseCase,
    ListCommissionRulesUseCase,
    UpdateCommissionRuleUseCase,
    GetLedgerUseCase,
    CommissionsFacade,
  ],
  controllers: [CommissionRulesController, LedgerController],
  exports: [
    CommissionsFacade,
    ResolveCommissionUseCase,
    CreateLedgerEntryUseCase,
  ],
})
export class CommissionsModule {}
