import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileAgent } from './entities/profile-agent.entity';
import { AgentListing } from './entities/agent-listing.entity';
import { User } from '../users/entities/user.entity';
import { Transaction } from '@/modules/finance/wallet/entities/transaction.entity';
import { AgentController } from './controllers/agent.controller';
import { DatabaseModule } from '@/core/database/database.module';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { PujaAppointmentModule } from '../puja-appointment/puja-appointment.module';
import { NotificationModule } from '../notification/notification.module';
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';

import { AgentFacade } from './agent.facade';
import { ProfileModule as ExpertProfileModule } from '../expert/profile/profile.module';
import { MerchantAccountModule } from '../merchant/account/account.module';
import { GetAgentProfileUseCase } from './use-cases/get-agent-profile.use-case';
import { UpdateAgentProfileUseCase } from './use-cases/update-agent-profile.use-case';
import { GetAgentStatsUseCase } from './use-cases/get-agent-stats.use-case';
import { GetAgentListingsUseCase } from './use-cases/get-agent-listings.use-case';
import { GetAgentCommissionsUseCase } from './use-cases/get-agent-commissions.use-case';
import { SettleAgentCommissionsUseCase } from './use-cases/settle-agent-commissions.use-case';
import { CreateAgentListingUseCase } from './use-cases/create-agent-listing.use-case';
import { IncrementRegistrationsWithQueryRunnerUseCase } from './use-cases/increment-registrations-with-query-runner.usecase';
import { UpdateAgentProfileWithQueryRunnerUseCase } from './use-cases/update-agent-profile-with-query-runner.usecase';
import { GetAdminAgentsUseCase } from './use-cases/get-admin-agents.use-case';
import { GetAdminAgentStatsUseCase } from './use-cases/get-admin-agent-stats.use-case';
import { GetAdminListingsUseCase } from './use-cases/get-admin-listings.use-case';
import { UpdateAdminListingStatusUseCase } from './use-cases/update-admin-listing-status.use-case';
import { RequestAgentWithdrawalUseCase } from './use-cases/request-agent-withdrawal.use-case';
import { UsersModule } from '../users/users.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileAgent, AgentListing, User, Transaction]),
    DatabaseModule,
    forwardRef(() => WalletModule),
    CommissionsModule,
    NotificationModule,
    UsersModule,
    forwardRef(() => AdminModule),
    forwardRef(() => ExpertProfileModule),
    forwardRef(() => MerchantAccountModule),
    forwardRef(() => ConsultationModule),
    forwardRef(() => PujaAppointmentModule),
  ],
  controllers: [AgentController],
  providers: [
    AgentFacade,
    GetAgentProfileUseCase,
    UpdateAgentProfileUseCase,
    GetAgentStatsUseCase,
    GetAgentListingsUseCase,
    GetAgentCommissionsUseCase,
    SettleAgentCommissionsUseCase,
    CreateAgentListingUseCase,
    IncrementRegistrationsWithQueryRunnerUseCase,
    UpdateAgentProfileWithQueryRunnerUseCase,
    GetAdminAgentsUseCase,
    GetAdminAgentStatsUseCase,
    GetAdminListingsUseCase,
    UpdateAdminListingStatusUseCase,
    RequestAgentWithdrawalUseCase,
  ],
  exports: [AgentFacade],
})
export class AgentModule {}
