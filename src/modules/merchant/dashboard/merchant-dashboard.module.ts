import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantDashboardController } from './api/controllers/merchant-dashboard.controller';
import { GetMerchantStatsUseCase } from './application/use-cases/get-merchant-stats.usecase';
import { GetRecentOrdersUseCase } from './application/use-cases/get-recent-orders.usecase';
import { GetMerchantOrdersUseCase } from './application/use-cases/get-merchant-orders.usecase';
import { GetMerchantActivityUseCase } from './application/use-cases/get-merchant-activity.usecase';
import { GetMerchantPerformanceUseCase } from './application/use-cases/get-merchant-performance.usecase';
import { GetMerchantAnalyticsUseCase } from './application/use-cases/get-merchant-analytics.usecase';
import { VerifyOrderOtpUseCase } from './application/use-cases/verify-order-otp.usecase';
import { GetMerchantFinanceStatsUseCase } from './application/use-cases/get-merchant-finance-stats.usecase';
import { SendOrderOtpUseCase } from './application/use-cases/send-order-otp.usecase';
import { CalculateMerchantEarningsUseCase } from './application/use-cases/calculate-merchant-earnings.usecase';
import { MerchantProductsController } from './api/controllers/merchant-products.controller';
import { MerchantFinanceController } from './api/controllers/merchant-finance.controller';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { CommissionsModule } from '@/modules/finance/commissions/commissions.module';
import { OrderModule } from '@/modules/commerce/order/order.module';
import { ProductModule } from '@/modules/commerce/product/product.module';
import { ConsultationModule } from '@/modules/consultation/consultation.module';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileModule } from '../profile/profile.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { NodemailerModule } from '@/external/nodemailer/nodemailer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileMerchant]),
    forwardRef(() => WalletModule),
    CommissionsModule,
    OrderModule,
    ProductModule,
    forwardRef(() => ConsultationModule),
    forwardRef(() => ProfileModule),
    NotificationModule,
    NodemailerModule,
  ],
  controllers: [
    MerchantDashboardController,
    MerchantProductsController,
    MerchantFinanceController,
  ],
  providers: [
    GetMerchantStatsUseCase,
    GetRecentOrdersUseCase,
    GetMerchantOrdersUseCase,
    GetMerchantActivityUseCase,
    GetMerchantPerformanceUseCase,
    GetMerchantAnalyticsUseCase,
    VerifyOrderOtpUseCase,
    GetMerchantFinanceStatsUseCase,
    SendOrderOtpUseCase,
    CalculateMerchantEarningsUseCase,
  ],
})
export class MerchantDashboardModule {}
