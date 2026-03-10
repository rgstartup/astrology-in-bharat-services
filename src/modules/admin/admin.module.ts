import { Module } from '@nestjs/common';
import { AdminController } from './api/controllers/admin.controller';
import { AdminFacade } from './application/admin.facade';
import { GetAdminDashboardStatsUseCase } from './application/use-cases/get-admin-dashboard-stats.use-case';
import { GetAdminUserGrowthStatsUseCase } from './application/use-cases/get-admin-user-growth-stats.use-case';
import { GetExpertDetailUseCase } from './application/use-cases/get-expert-detail.use-case';
import { UsersModule } from '@/modules/users/users.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { ProfileModule } from '@/modules/expert/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './infrastructure/persistence/entities/admin-audit-log.entity';
import { CouponModule } from '@/modules/coupon/coupon.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminAuditLog]),
    UsersModule,
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
  ],
})
export class AdminModule { }
