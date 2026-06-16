import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileAgent } from './infrastructure/entities/profile-agent.entity';
import { AgentListing } from './infrastructure/entities/agent-listing.entity';
import { AgentController } from './api/controllers/agent.controller';
import { DatabaseModule } from '@/core/database/database.module';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { CallSession } from '../consultation/call/infrastructure/entities/call-session.entity';
import { ChatSession } from '../consultation/chat/infrastructure/entities/chat-session.entity';
import { PujaAppointment } from '../puja-appointment/infrastructure/entities/puja-appointment.entity';
import { Order } from '../commerce/order/infrastructure/entities/order.entity';
import { NotificationModule } from '../notification/notification.module';
import { User } from '../users/infrastructure/entities/user.entity';
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';

import { AgentFacade } from './application/agent.facade';
import { ProfileModule as ExpertProfileModule } from '../expert/profile/profile.module';
import { ProfileModule as MerchantProfileModule } from '../merchant/profile/profile.module';
import { GetAgentProfileUseCase } from './application/use-cases/get-agent-profile.use-case';
import { UpdateAgentProfileUseCase } from './application/use-cases/update-agent-profile.use-case';
import { GetAgentStatsUseCase } from './application/use-cases/get-agent-stats.use-case';
import { GetAgentListingsUseCase } from './application/use-cases/get-agent-listings.use-case';
import { GetAgentCommissionsUseCase } from './application/use-cases/get-agent-commissions.use-case';
import { SettleAgentCommissionsUseCase } from './application/use-cases/settle-agent-commissions.use-case';
import { CreateAgentListingUseCase } from './application/use-cases/create-agent-listing.use-case';
import { IncrementRegistrationsWithQueryRunnerUseCase } from './application/use-cases/increment-registrations-with-query-runner.usecase';
import { UpdateAgentProfileWithQueryRunnerUseCase } from './application/use-cases/update-agent-profile-with-query-runner.usecase';
import { GetAdminAgentsUseCase } from './application/use-cases/get-admin-agents.use-case';
import { GetAdminAgentStatsUseCase } from './application/use-cases/get-admin-agent-stats.use-case';
import { GetAdminListingsUseCase } from './application/use-cases/get-admin-listings.use-case';
import { UpdateAdminListingStatusUseCase } from './application/use-cases/update-admin-listing-status.use-case';
import { UsersModule } from '../users/users.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProfileAgent,
      AgentListing,
      CallSession,
      ChatSession,
      PujaAppointment,
      Order,
      User,
    ]),
    DatabaseModule,
    forwardRef(() => WalletModule),
    CommissionsModule,
    NotificationModule,
    UsersModule,
    forwardRef(() => AdminModule),
    forwardRef(() => ExpertProfileModule),
    forwardRef(() => MerchantProfileModule),
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
  ],
  exports: [AgentFacade],
})
export class AgentModule {}
