import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './api/controllers/admin.controller';
import { AdminFacade } from './application/admin.facade';
import { GetAdminDashboardStatsUseCase } from './application/use-cases/get-admin-dashboard-stats.use-case';
import { GetAdminUserGrowthStatsUseCase } from './application/use-cases/get-admin-user-growth-stats.use-case';
import { GetExpertDetailUseCase } from './application/use-cases/get-expert-detail.use-case';
import { GetFilteredUsersUseCase } from './application/use-cases/get-filtered-users.use-case';
import { AssignCouponBulkUseCase } from './application/use-cases/assign-coupon-bulk.use-case';
import { CreateAgentUseCase } from './application/use-cases/create-agent.use-case';
import { GetAgentsUseCase } from './application/use-cases/get-agents.use-case';
import { GetAgentStatsUseCase } from './application/use-cases/get-agent-stats.use-case';
import { GetAdminListingsUseCase } from './application/use-cases/get-admin-listings.use-case';
import { AdminAuditLog } from './infrastructure/persistence/entities/admin-audit-log.entity';
import { ChatSession } from '../chat/infrastructure/persistence/entities/chat-session.entity';
import { Order } from '../order/infrastructure/persistence/entities/order.entity';
import { Coupon } from '../coupon/infrastructure/persistence/entities/coupon.entity';
import { UserCoupon } from '../coupon/infrastructure/persistence/entities/user-coupon.entity';
import { AgentProfile } from '../agent/infrastructure/persistence/entities/agent-profile.entity';
import { User } from '../users/infrastructure/persistence/entities/user.entity';
import { AgentListing } from '../agent/infrastructure/persistence/entities/agent-listing.entity';
import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ProfileModule } from '@/modules/expert/profile/profile.module';
import { CouponModule } from '@/modules/coupon/coupon.module';
import { ExternalModule } from '@/external/external.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminAuditLog, ChatSession, Order, Coupon, UserCoupon, AgentProfile, User, AgentListing]),
    UsersModule,
    ExternalModule,
    WalletModule,
    ChatModule,
    ProfileModule,
    CouponModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminFacade,
    GetAdminDashboardStatsUseCase,
    GetAdminUserGrowthStatsUseCase,
    GetExpertDetailUseCase,
    GetFilteredUsersUseCase,
    AssignCouponBulkUseCase,
    CreateAgentUseCase,
    GetAgentsUseCase,
    GetAgentStatsUseCase,
    GetAdminListingsUseCase,
  ],
})
export class AdminModule {}
