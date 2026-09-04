import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminFacade } from './admin.facade';
import { GetAdminDashboardStatsUseCase } from './use-cases/get-admin-dashboard-stats.use-case';
import { GetAdminUserGrowthStatsUseCase } from './use-cases/get-admin-user-growth-stats.use-case';
import { GetExpertDetailUseCase } from './use-cases/get-expert-detail.use-case';
import { GetFilteredUsersUseCase } from './use-cases/get-filtered-users.use-case';

import { CreateAgentUseCase } from './use-cases/create-agent.use-case';
import { GetAgentsUseCase } from './use-cases/get-agents.use-case';
import { GetAgentStatsUseCase } from './use-cases/get-agent-stats.use-case';
import { GetAdminListingsUseCase } from './use-cases/get-admin-listings.use-case';
import { GetAdminRevenueTrendUseCase } from './use-cases/get-admin-revenue-trend.use-case';
import { GetAdminEarningsBreakdownUseCase } from './use-cases/get-admin-earnings-breakdown.use-case';
import { GetAdminTopExpertsUseCase } from './use-cases/get-admin-top-experts.use-case';
import { GetAdminMerchantsUseCase } from './use-cases/get-admin-merchants.use-case';
import { UpdateMerchantStatusAdminUseCase } from './use-cases/update-merchant-status-admin.use-case';
import { UpdateListingStatusAdminUseCase } from './use-cases/update-listing-status-admin.use-case';
import { GetAdminMerchantSalesOverviewUseCase } from './use-cases/get-admin-merchant-sales-overview.use-case';
import { GetAdminMerchantSalesDetailsUseCase } from './use-cases/get-admin-merchant-sales-details.use-case';

import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
// import { ChatModule } from '@/modules/chat/chat.module';
import { ProfileModule } from '@/modules/expert/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { CouponModule } from '@/modules/client/commerce/coupon/coupon.module';
import { ChatSession } from '../consultation/chat/infrastructure/entities/chat-session.entity';
import { ExternalModule } from '@/external/external.module';
import { User } from '../users/infrastructure/entities/user.entity';
import { Transaction } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { SupportModule } from '../support/support.module';
import { ProfileExpert } from '../expert/profile/infrastructure/entities/profile-expert.entity';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { MerchantModule } from '../merchant/merchant.module';
import { AgentModule } from '../agent/agent.module';

import { SystemSetting } from './entities/system-setting.entity';
import { SettingsController } from './controllers/settings.controller';
import { PublicStatsController } from './controllers/public-stats.controller';
import { GetSupportSettingsUseCase } from './use-cases/get-support-settings.usecase';
import { GetSystemSettingsUseCase } from './use-cases/get-system-settings.use-case';
import { UpdateSystemSettingUseCase } from './use-cases/update-system-setting.use-case';
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';
import { ConsultationModule } from '../consultation/consultation.module';
import { PujaAppointmentModule } from '@/modules/puja-appointment/puja-appointment.module';
import { OrderModule } from '@/modules/client/commerce/order/order.module';

import { PublicSettingsController } from './controllers/public-settings.controller';
import { IHasherToken } from '@/common/contracts/hasher.contract';
import { Argon2PasswordHasher } from '../auth/infrastructure/hashing/argon2-password.hasher';

// New Use Cases
import { GetAdminClientsUseCase } from './use-cases/get-admin-clients.use-case';
import { GetAdminExpertsUseCase } from './use-cases/get-admin-experts.use-case';
import { GetLiveSessionsUseCase } from './use-cases/get-live-sessions.use-case';
import { TerminateSessionUseCase } from './use-cases/terminate-session.use-case';
import { GetAdminWithdrawalsUseCase } from './use-cases/get-admin-withdrawals.use-case';
import { UpdateWithdrawalStatusUseCase } from './use-cases/update-withdrawal-status.use-case';
import { UpdateExpertStatusUseCase } from './use-cases/update-expert-status.use-case';
import { GetAdminDisputesUseCase } from './use-cases/get-admin-disputes.use-case';
import { UpdateDisputeStatusUseCase } from './use-cases/update-dispute-status.use-case';
import { UpdateSupportSettingsUseCase } from './use-cases/update-support-settings.use-case';

// Sub-Admin Use Cases & Controller
import { CreateSubAdminUseCase } from './use-cases/create-sub-admin.use-case';
import { GetSubAdminsUseCase } from './use-cases/get-sub-admins.use-case';
import { UpdateSubAdminUseCase } from './use-cases/update-sub-admin.use-case';
import { DeleteSubAdminUseCase } from './use-cases/delete-sub-admin.use-case';
import { SubAdminController } from './controllers/sub-admin.controller';
import { ToggleUserBlockUseCase } from './use-cases/toggle-user-block.use-case';
import { GetPlatformStatsUseCase } from './use-cases/get-platform-stats.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminAuditLog,
      User,
      SystemSetting,
      ChatSession,
      Transaction,
      ProfileExpert,
      ClientAccount,
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
    forwardRef(() => PujaAppointmentModule),
    forwardRef(() => OrderModule),
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
    GetPlatformStatsUseCase,

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
