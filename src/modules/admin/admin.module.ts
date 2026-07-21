import { Module, forwardRef } from '@nestjs/common';
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
import { GetAdminMerchantsUseCase } from './application/use-cases/get-admin-merchants.use-case';
import { UpdateMerchantStatusAdminUseCase } from './application/use-cases/update-merchant-status-admin.use-case';
import { UpdateListingStatusAdminUseCase } from './application/use-cases/update-listing-status-admin.use-case';
import { GetAdminMerchantSalesOverviewUseCase } from './application/use-cases/get-admin-merchant-sales-overview.use-case';
import { GetAdminMerchantSalesDetailsUseCase } from './application/use-cases/get-admin-merchant-sales-details.use-case';

import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
// import { ChatModule } from '@/modules/chat/chat.module';
import { ProfileModule } from '@/modules/expert/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './infrastructure/entities/admin-audit-log.entity';
import { CouponModule } from '@/modules/commerce/coupon/coupon.module';
import { CallSession } from '../consultation/call/infrastructure/entities/call-session.entity';
import { ChatSession } from '../consultation/chat/infrastructure/entities/chat-session.entity';
import { Order } from '../commerce/order/infrastructure/entities/order.entity';
import { Coupon } from '../commerce/coupon/infrastructure/entities/coupon.entity';
import { UserCoupon } from '../commerce/coupon/infrastructure/entities/user-coupon.entity';
import { ExternalModule } from '@/external/external.module';
import { ProfileAgent } from '../agent/infrastructure/entities/profile-agent.entity';
import { User } from '../users/infrastructure/entities/user.entity';
import { AgentListing } from '../agent/infrastructure/entities/agent-listing.entity';
import { Transaction } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { SupportModule } from '../support/support.module';
import { PujaAppointment } from '../puja-appointment/infrastructure/entities/puja-appointment.entity';
import { OrderItem } from '../commerce/order/infrastructure/entities/order-item.entity';
import { Product } from '../commerce/product/infrastructure/entities/product.entity';
import { ProfileMerchant } from '../merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileExpert } from '../expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { MerchantModule } from '../merchant/merchant.module';
import { AgentModule } from '../agent/agent.module';

import { SystemSetting } from './infrastructure/entities/system-setting.entity';
import { SettingsController } from './api/controllers/settings.controller';
import { PublicStatsController } from './api/controllers/public-stats.controller';
import { GetSupportSettingsUseCase } from './application/use-cases/get-support-settings.usecase';
import { GetSystemSettingsUseCase } from './application/use-cases/get-system-settings.use-case';
import { UpdateSystemSettingUseCase } from './application/use-cases/update-system-setting.use-case';
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';
import { OrderModule } from '@/modules/commerce/order/order.module';

import { PublicSettingsController } from './api/controllers/public-settings.controller';
import { IHasherToken } from '@/common/contracts/hasher.contract';
import { Argon2PasswordHasher } from '../auth/infrastructure/hashing/argon2-password.hasher';

// New Use Cases
import { GetAdminClientsUseCase } from './application/use-cases/get-admin-clients.use-case';
import { GetAdminExpertsUseCase } from './application/use-cases/get-admin-experts.use-case';
import { GetLiveSessionsUseCase } from './application/use-cases/get-live-sessions.use-case';
import { TerminateSessionUseCase } from './application/use-cases/terminate-session.use-case';
import { GetAdminWithdrawalsUseCase } from './application/use-cases/get-admin-withdrawals.use-case';
import { UpdateWithdrawalStatusUseCase } from './application/use-cases/update-withdrawal-status.use-case';
import { UpdateExpertStatusUseCase } from './application/use-cases/update-expert-status.use-case';
import { GetAdminDisputesUseCase } from './application/use-cases/get-admin-disputes.use-case';
import { UpdateDisputeStatusUseCase } from './application/use-cases/update-dispute-status.use-case';
import { UpdateSupportSettingsUseCase } from './application/use-cases/update-support-settings.use-case';

// Sub-Admin Use Cases & Controller
import { CreateSubAdminUseCase } from './application/use-cases/create-sub-admin.use-case';
import { GetSubAdminsUseCase } from './application/use-cases/get-sub-admins.use-case';
import { UpdateSubAdminUseCase } from './application/use-cases/update-sub-admin.use-case';
import { DeleteSubAdminUseCase } from './application/use-cases/delete-sub-admin.use-case';
import { SubAdminController } from './api/controllers/sub-admin.controller';
import { ToggleUserBlockUseCase } from './application/use-cases/toggle-user-block.use-case';

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
      ProfileAgent,
      User,
      AgentListing,
      Transaction,
      CallSession,
      PujaAppointment,
      SystemSetting,
      ProfileMerchant,
      ProfileExpert,
      ProfileClient,
    ]),

    UsersModule,
    ExternalModule,
    forwardRef(() => WalletModule),
    CommissionsModule,
    forwardRef(() => ConsultationModule),
    forwardRef(() => ProfileModule),
    forwardRef(() => MerchantModule),
    CouponModule,
    SupportModule,
    PujaAppointmentModule,
    OrderModule,
    forwardRef(() => AgentModule),
  ],
  controllers: [
    AdminController,
    SettingsController,
    PublicStatsController,
    PublicSettingsController,
    SubAdminController,
  ],
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
    GetAdminMerchantsUseCase,
    UpdateMerchantStatusAdminUseCase,
    UpdateListingStatusAdminUseCase,
    GetAdminMerchantSalesOverviewUseCase,
    GetAdminMerchantSalesDetailsUseCase,
    GetSystemSettingsUseCase,
    UpdateSystemSettingUseCase,
    {
      provide: IHasherToken,
      useClass: Argon2PasswordHasher,
    },

    // Registering new Use Cases
    GetAdminClientsUseCase,
    GetAdminExpertsUseCase,
    GetLiveSessionsUseCase,
    TerminateSessionUseCase,
    GetAdminWithdrawalsUseCase,
    UpdateWithdrawalStatusUseCase,
    UpdateExpertStatusUseCase,
    GetAdminDisputesUseCase,
    UpdateDisputeStatusUseCase,
    UpdateSupportSettingsUseCase,

    // Sub-Admin Use Cases
    CreateSubAdminUseCase,
    GetSubAdminsUseCase,
    UpdateSubAdminUseCase,
    DeleteSubAdminUseCase,

    // User Block Audit
    ToggleUserBlockUseCase,
  ],
  exports: [AdminFacade],
})
export class AdminModule {}
