import { Module } from '@nestjs/common';
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
import { GetAdminRevenueTrendUseCase } from './application/use-cases/get-admin-revenue-trend.use-case';
import { GetAdminEarningsBreakdownUseCase } from './application/use-cases/get-admin-earnings-breakdown.use-case';
import { GetAdminTopExpertsUseCase } from './application/use-cases/get-admin-top-experts.use-case';

import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ProfileModule } from '@/modules/expert/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './infrastructure/persistence/entities/admin-audit-log.entity';
import { CouponModule } from '@/modules/coupon/coupon.module';
import { ChatSession } from '../chat/infrastructure/persistence/entities/chat-session.entity';
import { Order } from '../order/infrastructure/persistence/entities/order.entity';
import { Coupon } from '../coupon/infrastructure/persistence/entities/coupon.entity';
import { UserCoupon } from '../coupon/infrastructure/persistence/entities/user-coupon.entity';
import { RolesModule } from '../role/roles.module';
import { ExternalModule } from '@/external/external.module';
import { Role } from '../role/entities/roles.entity';
import { AgentProfile } from '../agent/infrastructure/persistence/entities/agent-profile.entity';
import { User } from '../users/infrastructure/persistence/entities/user.entity';
import { AgentListing } from '../agent/infrastructure/persistence/entities/agent-listing.entity';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { Transaction } from '../wallet/infrastructure/persistence/entities/transaction.entity';
import { SupportModule } from '../support/support.module';
import { CallSession } from '../call/infrastructure/persistence/entities/call-session.entity';
import { PujaAppointment } from '../puja-appointment/infrastructure/persistence/entities/puja-appointment.entity';
import { OrderItem } from '../order/infrastructure/persistence/entities/order-item.entity';
import { Product } from '../product/infrastructure/persistence/entities/product.entity';

import { SystemSetting } from './infrastructure/persistence/entities/system-setting.entity';
import { SettingsController } from './api/controllers/settings.controller';
import { GetSupportSettingsUseCase } from './application/use-cases/get-support-settings.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminAuditLog, 
      ChatSession, 
      Order, 
      OrderItem,
      Product,
      Coupon, 
      UserCoupon, 
      Role, 
      AgentProfile, 
      User, 
      AgentListing,
      Transaction,
      CallSession,
      PujaAppointment,
      SystemSetting,
    ]),

    UsersModule,
    RolesModule,
    ExternalModule,
    WalletModule,
    ChatModule,
    ProfileModule,
    CouponModule,
    ReviewsModule,
    SupportModule,
  ],
  controllers: [AdminController, SettingsController],
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
    GetAdminRevenueTrendUseCase,
    GetAdminEarningsBreakdownUseCase,
    GetAdminTopExpertsUseCase,
    GetSupportSettingsUseCase,
  ],
})
export class AdminModule { }
