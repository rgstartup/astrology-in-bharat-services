import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { ExpertDashboardModule } from './dashboard/expert-dashboard.module';
import { TodosModule } from './todos/todos.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { ExpertEarningsModule } from './earnings/expert-earnings.module';

@Module({
  imports: [
    BankAccountsModule,
    ExpertDashboardModule,
    TodosModule,
    ExpertEarningsModule,
    ProfileModule,
  ],
})
export class ExpertModule { }
