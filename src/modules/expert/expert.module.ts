import { Module } from '@nestjs/common';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { ExpertEarningsModule } from './earnings/expert-earnings.module';
import { ExpertDashboardModule } from './dashboard/expert-dashboard.module';
import { TodosModule } from './todos/todos.module';
import { ExpertAuthModule } from './auth/auth.module';
import { ExpertAccountModule } from './account/account.module';
import { SpecializationModule } from './specialization/specialization.module';

@Module({
  imports: [
    BankAccountsModule,
    ExpertEarningsModule,
    ExpertDashboardModule,
    TodosModule,
    ExpertAuthModule,
    ExpertAccountModule,
    SpecializationModule,
  ],
  exports: [
    BankAccountsModule,
    ExpertEarningsModule,
    ExpertDashboardModule,
    TodosModule,
    ExpertAuthModule,
    ExpertAccountModule,
    SpecializationModule,
  ],
})
export class ExpertModule {}
